const mongoose = require('mongoose');
const Post = require('../models/Post');
const SavedFolder = require('../models/SavedFolder');
const SavedItem = require('../models/SavedItem');
const Video = require('../models/Video');

const itemModels = { post: Post, video: Video };

const listSavedItems = async (req, res) => {
  try {
    const [folders, savedItems, legacyPosts, legacyVideos] = await Promise.all([
      SavedFolder.find({ user: req.user._id }).sort({ name: 1 }).lean(),
      SavedItem.find({ user: req.user._id }).select('folder itemType item').lean(),
      Post.find({ saves: req.user._id }).select('_id').lean(),
      Video.find({ saves: req.user._id }).select('_id').lean()
    ]);

    const savedItemKeys = new Set(
      savedItems.map((savedItem) => `${savedItem.itemType}:${savedItem.item}`)
    );
    const items = [
      ...savedItems.map((savedItem) => ({
        itemType: savedItem.itemType,
        itemId: String(savedItem.item),
        folderId: String(savedItem.folder)
      })),
      ...legacyPosts
        .filter((post) => !savedItemKeys.has(`post:${post._id}`))
        .map((post) => ({ itemType: 'post', itemId: String(post._id), folderId: null })),
      ...legacyVideos
        .filter((video) => !savedItemKeys.has(`video:${video._id}`))
        .map((video) => ({ itemType: 'video', itemId: String(video._id), folderId: null }))
    ];

    res.json({ folders, items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createSavedFolder = async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name) return res.status(400).json({ message: 'Folder name is required' });
    if (name.length > 50) return res.status(400).json({ message: 'Folder name must be 50 characters or fewer' });

    const folder = await SavedFolder.create({ user: req.user._id, name });
    res.status(201).json(folder);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'You already have a folder with that name' });
    }
    res.status(500).json({ message: error.message });
  }
};

const saveItemToFolder = async (req, res) => {
  try {
    const { itemType, itemId, folderId } = req.body;
    const ItemModel = Object.prototype.hasOwnProperty.call(itemModels, itemType)
      ? itemModels[itemType]
      : null;
    if (!ItemModel || !mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: 'A valid post or video is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(400).json({ message: 'Select a valid folder' });
    }

    const [item, folder] = await Promise.all([
      ItemModel.findById(itemId).select('_id saves'),
      SavedFolder.findOne({ _id: folderId, user: req.user._id }).select('_id')
    ]);
    if (!item) return res.status(404).json({ message: `${itemType} not found` });
    if (!folder) return res.status(404).json({ message: 'Folder not found' });

    await SavedItem.findOneAndUpdate(
      { user: req.user._id, itemType, item: item._id },
      { $set: { folder: folder._id } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    await ItemModel.updateOne(
      { _id: item._id, saves: { $ne: req.user._id } },
      { $addToSet: { saves: req.user._id } }
    );
    const updatedItem = await ItemModel.findById(item._id).select('saves').lean();
    const savesCount = updatedItem?.saves.length || 0;

    res.json({ itemType, itemId: String(item._id), folderId: String(folder._id), isSaved: true, savesCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeSavedItem = async (req, res) => {
  try {
    const { itemType, itemId } = req.params;
    const ItemModel = Object.prototype.hasOwnProperty.call(itemModels, itemType)
      ? itemModels[itemType]
      : null;
    if (!ItemModel || !mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: 'A valid post or video is required' });
    }

    const item = await ItemModel.findById(itemId).select('_id');
    if (!item) return res.status(404).json({ message: `${itemType} not found` });

    await Promise.all([
      SavedItem.deleteOne({ user: req.user._id, itemType, item: item._id }),
      ItemModel.updateOne({ _id: item._id }, { $pull: { saves: req.user._id } })
    ]);
    const updatedItem = await ItemModel.findById(item._id).select('saves').lean();
    res.json({
      itemType,
      itemId: String(item._id),
      isSaved: false,
      savesCount: updatedItem?.saves.length || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { listSavedItems, createSavedFolder, saveItemToFolder, removeSavedItem };
