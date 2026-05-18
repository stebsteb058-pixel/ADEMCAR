const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
        return res.status(401).json({ message: 'Non autorisé - Pas de token' });
    }
    
    try {
        // Utilisez le MÊME secret que dans auth.js
        const secret = process.env.JWT_SECRET || 'adem_rent_car_secret_key_2024';
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('JWT Verification error:', error.message);
        return res.status(401).json({ message: 'Non autorisé - Token invalide' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }
    next();
};

module.exports = { protect, adminOnly };
