const express = require('express');
const db = require('../config/database-sqlite');
const { protect } = require('../middleware/auth');
const router = express.Router();

// ========== GET tous les véhicules ==========
router.get('/', protect, async (req, res) => {
    try {
        let sql = 'SELECT * FROM vehicules';
        let params = [];
        
        // Filtrer par créateur si ce n'est pas admin
        if (req.user.role !== 'admin') {
            sql += ' WHERE createur = ?';
            params.push(req.user.username);
        }
        
        sql += ' ORDER BY id DESC';
        
        const result = await db.execute({ sql, args: params });
        
        // ✅ IMPORTANT: Toujours retourner un tableau, même vide
        res.json(result.rows || []);
        
    } catch (error) {
        console.error('Erreur GET vehicules:', error.message);
        // ✅ En cas d'erreur, retourner un tableau vide
        res.json([]);
    }
});

// ========== GET un véhicule par ID ==========
router.get('/:id', protect, async (req, res) => {
    try {
        const result = await db.execute({
            sql: 'SELECT * FROM vehicules WHERE id = ?',
            args: [req.params.id]
        });
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Véhicule non trouvé' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erreur GET vehicule:', error.message);
        res.status(500).json({ message: error.message });
    }
});

// ========== POST créer un véhicule ==========
router.post('/', protect, async (req, res) => {
    try {
        const { modele, immat, couleur, annee, carburant, prixJournalier, notes } = req.body;
        
        if (!modele || !immat) {
            return res.status(400).json({ message: 'Modèle et immatriculation requis' });
        }
        
        // Vérifier si l'immatriculation existe déjà
        const existing = await db.execute({
            sql: 'SELECT id FROM vehicules WHERE immat = ?',
            args: [immat]
        });
        
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: 'Cette immatriculation existe déjà' });
        }
        
        const result = await db.execute({
            sql: `INSERT INTO vehicules (modele, immat, couleur, annee, carburant, prixJournalier, notes, createur) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [modele, immat, couleur || '', annee || '', carburant || 'Essence', prixJournalier || 80, notes || '', req.user.username]
        });
        
        res.status(201).json({ 
            id: result.lastInsertRowid,
            modele, 
            immat,
            message: 'Véhicule créé avec succès'
        });
        
    } catch (error) {
        console.error('Erreur POST vehicule:', error.message);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
