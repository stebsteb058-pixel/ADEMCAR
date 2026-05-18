const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/database-sqlite');  // Ton fichier modifié avec Turso
const router = express.Router();

// ========== ROUTE LOGIN (CORRIGÉE POUR TURSO) ==========
router.post('/login', async (req, res) => {
    console.log('Login attempt:', req.body.username);
    
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ message: 'Username et password requis' });
    }
    
    // ⚠️ CHANGEMENT IMPORTANT : db.get() devient db.execute()
    try {
        const result = await db.execute({
            sql: 'SELECT * FROM users WHERE username = ?',
            args: [username]
        });
        
        const user = result.rows[0];  // Turso retourne les résultats dans result.rows
        
        if (!user) {
            console.log('User not found:', username);
            return res.status(401).json({ message: 'Identifiants incorrects' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Invalid password for:', username);
            return res.status(401).json({ message: 'Identifiants incorrects' });
        }
        
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, company: user.company },
            process.env.JWT_SECRET || 'adem_rent_car_secret_key_2024',
            { expiresIn: '30d' }
        );
        
        console.log('Login successful:', username);
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
        console.error('Database error:', error.message);
        res.status(500).json({ message: 'Erreur base de données' });
    }
});

// ========== ROUTE INIT (CORRIGÉE POUR TURSO) ==========
router.post('/init', async (req, res) => {
    try {
        // Vérifier si admin existe
        const result = await db.execute({
            sql: 'SELECT * FROM users WHERE username = ?',
            args: ['admin']
        });
        
        const user = result.rows[0];
        
        if (!user) {
            // Créer admin
            const hashedAdmin = await bcrypt.hash('admin123', 10);
            await db.execute({
                sql: 'INSERT INTO users (username, password, role, company) VALUES (?, ?, ?, ?)',
                args: ['admin', hashedAdmin, 'admin', 'Administrateur']
            });
            
            // Créer sous-traitant 1
            const hashedSous1 = await bcrypt.hash('sous123', 10);
            await db.execute({
                sql: 'INSERT INTO users (username, password, role, company) VALUES (?, ?, ?, ?)',
                args: ['sous1', hashedSous1, 'sous_traitant', 'Adem Rent Car']
            });
            
            // Créer sous-traitant 2
            const hashedSous2 = await bcrypt.hash('sous456', 10);
            await db.execute({
                sql: 'INSERT INTO users (username, password, role, company) VALUES (?, ?, ?, ?)',
                args: ['sous2', hashedSous2, 'sous_traitant', 'Location Express']
            });
            
            res.json({ message: 'Utilisateurs créés avec succès' });
        } else {
            res.json({ message: 'Utilisateurs déjà existants' });
        }
        
    } catch (error) {
        console.error('Init error:', error.message);
        res.status(500).json({ message: 'Erreur: ' + error.message });
    }
});

module.exports = router;
