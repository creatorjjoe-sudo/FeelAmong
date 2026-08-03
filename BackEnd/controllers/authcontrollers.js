import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const generateToken = (id) => {
    return jwt.sign({id}, process.env.JWT_SECRET, {expiresIn: '30d'});
};

export const signup = async (req, res) => {
    try {
        const {username, email, password} = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({message: 'All registration fields are required'});
        }

        const emailExists = await User.findOne({email});
        const usernameExists = await User.findOne({username});
        if (emailExists || usernameExists) {
            return res.status(400).json({message: 'User identity credentials already registered'});
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

        const user = await User.findOne({email});
        if (!user) return res.status(401).json({message: 'Invalid credentials provided'});

        // Direct, manual password comparisons
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({message: 'Invalid credentials provided'});

        res.status(200).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            token: generateToken(user._id)
        });
    } catch (error) {
        res.status(500).json({message: 'Signin pipeline failure', error: error.message});
    }
};

// Fetch every user except yourself to establish a dynamic directory listing
export const getAllUsers = async (req, res) => {
    try {
        const directoryUsers = await User.find({_id: { $ne: req.user._id} }).select('-password');
        res.status(200).json(directoryUsers);
    } catch (error) {
        res.status(500).json({message: 'Failed to extract directory roster', error: error.message});
    }
};
