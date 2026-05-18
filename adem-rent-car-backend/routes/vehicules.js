const express = require('express');
const db = require('../config/database-sqlite');
const { protect } = require('../middleware/auth');
const router = express.Router();

// ========== GET tous les véhicules ==========
router.get('/', protect, async (req, res) => {
    try {
        let sql = 'SELECT * FROM vehicules';
        let params = [];
        
        if (req.user.role !== 'admin') {
            sql += ' WHERE createur = ?';
            params.push(req.user.username);
        }
        
        sql += ' ORDER BY id DESC';
        
        const result = await db.execute({ sql, args: params });
        
        // ✅ Toujours retourner un tableau
        res.json(result.rows || []);
        
    } catch (error) {
        console.error('Erreur GET vehicules:', error.message);
        res.json([]);
    }
});

// ========== POST créer un véhicule ==========
router.post('/', protect, async (req, res) => {
    try {
        const { modele, immat, couleur, annee, carburant, prixJournalier, notes } = req.body;
        
        const result = await db.execute({
            sql: `INSERT INTO vehicules (modele, immat, couleur, annee, carburant, prixJournalier, notes, createur) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [modele, immat, couleur || '', annee || '', carburant || 'Essence', prixJournalier || 80, notes || '', req.user.username]
        });
        
        res.status(201).json({ id: result.lastInsertRowid, message: 'Véhicule créé' });
        
    } catch (error) {
        console.error('Erreur POST vehicule:', error.message);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
