import jwt from 'jsonwebtoken';
import User from '../models/user.js';

export const protect = async (req, res, next) => {
    let tokenStr;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            tokenStr = req.headers.authorization.split(' ')[1];
            const decodedToken = jwt.verify(tokenStr, process.env.JWT_SECRET);
            req.user = await User.findById(decodedToken.id).select('-password');
            return next();
        } catch (error) {
            return res.status(401).json({ message: 'Access denied: Token evaluation failure' });
        }
    }
    if (!tokenStr) return res.status(401).json({ message: 'Access denied: Token string structural missing exception' });
};
