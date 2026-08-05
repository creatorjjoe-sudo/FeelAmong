import User from '../models/user.js';
import Message from '../models/message.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose'; // NEW: Explicitly imported Mongoose to handle strict ObjectId type casting

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

export const signup = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'All registration fields are required' });
        }

        const emailExists = await User.findOne({ email });
        const usernameExists = await User.findOne({ username });
        if (emailExists || usernameExists) {
            return res.status(400).json({ message: 'User identity credentials already registered' });
        }

        // Hashing passwords explicitly inside the controller level execution
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            username,
            email,
            password: hashedPassword
        });

        res.status(201).json({
            _id: newUser._id,
            username: newUser.username,
            email: newUser.email,
            token: generateToken(newUser._id)
        });
    } catch (error) {
        res.status(500).json({ message: 'Signup pipeline failure', error: error.message });
    }
};

export const signin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ message: 'Invalid credentials provided' });

        // Direct, manual password comparisons
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials provided' });

        res.status(200).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePic: user.profilePic,
            token: generateToken(user._id)
        });
    } catch (error) {
        res.status(500).json({ message: 'Signin pipeline failure', error: error.message });
    }
};

// UPGRADED: Dynamic directory extraction sorting by most recent communication exchanges
export const getAllUsers = async (req, res) => {
    try {
        // Strict Type Casting: Force the current user ID into a genuine MongoDB ObjectId match type
        const currentUserId = new mongoose.Types.ObjectId(req.user._id);

        const usersWithSortingMetrics = await User.aggregate([
            // 1. Exclude the currently logged-in user from the listing context
            { $match: { _id: { $ne: currentUserId } } },

            // 2. Perform a lookup matching any bidirectional message rows between users
            {
                $lookup: {
                    from: 'messages',
                    let: { targetUserId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $and: [{ $eq: ['$sender', currentUserId] }, { $eq: ['$receiver', '$$targetUserId'] }] },
                                        { $and: [{ $eq: ['$sender', '$$targetUserId'] }, { $eq: ['$receiver', currentUserId] }] }
                                    ]
                                }
                            }
                        },
                        { $sort: { createdAt: -1 } },
                        { $limit: 1 }
                    ],
                    as: 'lastMessage'
                }
            }],

            // 3. Destructure the array payload safely using unwind paths
            [{
                $unwind: {
                    path: '$lastMessage',
                    preserveNullAndEmptyArrays: true
                }
            },

            // 4. Calculate an explicit sort index. If no message history exists, default to baseline entry dates
            {
                $addFields: {
                    lastInteraction: { $ifNull: ['$lastMessage.createdAt', '$createdAt'] }
                }
            },

            // 5. Sort descending -> Most recently active users push immediately to the top row
            { $sort: { lastInteraction: -1 } },

            // 6. Project clean sanitized profiles containing username, email, and profilePic while explicitly hiding passwords
            {
                $project: {
                    username: 1,
                    email: 1,
                    profilePic: 1
                }
            }
            ]);

        res.status(200).json(usersWithSortingMetrics);
    } catch (error) {
        res.status(500).json({ message: 'Failed to extract sorted directory roster', error: error.message });
    }
};

// Explicit profile update routine controller action configuration block
export const updateProfile = async (req, res) => {
    try {
        const { username, email } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) return res.status(404).json({ message: 'Target profile user records not found' });

        // Update basic tracking text identifiers if passed through
        if (username) user.username = username;
        if (email) user.email = email.toLowerCase();

        // If a file was uploaded by multer, attach its server path URL
        if (req.file) {
            user.profilePic = `/uploads/${req.file.filename}`;
        }

        const savedUserUpdate = await user.save();

        res.status(200).json({
            _id: savedUserUpdate._id,
            username: savedUserUpdate.username,
            email: savedUserUpdate.email,
            profilePic: savedUserUpdate.profilePic
        });
    } catch (error) {
        res.status(500).json({ message: 'Profile execution database processing update failure', error: error.message });
    }
};
