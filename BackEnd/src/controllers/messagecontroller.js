import Message from '../models/message.js';

export const sendMessage = async (req, res) => {
    try {
        const { receiverId, text } = req.body;
        const senderId = req.user._id;

        if (!text) return res.status(400).json({ message: 'Message content cannot be blank' });

        const freshMessage = await Message.create({
            sender: senderId,
            receiver: receiverId,
            text
        });

        res.status(201).json(freshMessage);
    } catch (error) {
        res.status(500).json({ message: 'Message storage operation aborted', error: error.message });
    }
};

export const getConversation = async (req, res) => {
    try {
        const { targetUserId } = req.params;
        const selfUserId = req.user._id;

        // Fetch bidirectional history logs matching either tracking condition
        const history = await Message.find({
            $or: [
                { sender: selfUserId, receiver: targetUserId },
                { sender: targetUserId, receiver: selfUserId }
            ]
        }).sort({ createdAt: 1 });

        res.status(200).json(history);
    } catch (error) {
        res.status(500).json({ message: 'Chat tracking history fetch failure', error: error.message });
    }
};
