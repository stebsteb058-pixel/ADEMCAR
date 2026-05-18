const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/database-sqlite');
const router = express.Router();

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // ✅ CHANGEMENT 1 : db.get() remplacé par db.execute()
        const result = await db.execute({
            sql: 'SELECT * FROM users WHERE username = ?',
            args: [username]
        });
        
        const user = result.rows[0];  // ✅ CHANGEMENT 2 : récupérer le premier résultat
        
        if (!user) {
            return res.status(401).json({ message: 'Identifiants incorrects' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Identifiants incorrects' });
        }
        
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, company: user.company },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );
        
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                company: user.company
            }
        });
        
    } catch (error) {
        console.error('Login error:', error.message);  // ✅ Ajouté pour déboguer
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router;
