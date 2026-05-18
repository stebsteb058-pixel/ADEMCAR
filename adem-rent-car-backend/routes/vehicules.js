const express = require('express');
const db = require('../config/database-sqlite');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.use(protect);

// GET tous les véhicules
router.get('/', (req, res) => {
    // Vérifier si la table existe, sinon la créer
    db.run(`CREATE TABLE IF NOT EXISTS vehicules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        createur TEXT,
        modele TEXT,
        immat TEXT UNIQUE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Erreur création table vehicules:', err);
            return res.status(500).json({ message: 'Erreur base de données' });
        }
        // Requête sécurisée
        db.all('SELECT * FROM vehicules WHERE createur = ? ORDER BY createdAt DESC', [req.user.username], (err2, rows) => {
            if (err2) {
                console.error('Erreur SELECT vehicules:', err2);
                return res.status(500).json({ message: 'Erreur récupération véhicules' });
            }
            res.json(rows || []);
        });
    });
});

// POST création
router.post('/', (req, res) => {
    const { modele, immat } = req.body;
    if (!modele || !immat) {
        return res.status(400).json({ message: 'Modèle et immatriculation requis' });
    }
    db.run(`INSERT INTO vehicules (createur, modele, immat) VALUES (?, ?, ?)`,
        [req.user.username, modele, immat],
        function(err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Erreur insertion véhicule' });
            }
            res.json({ id: this.lastID, modele, immat });
        });
});

router.put('/:immat', protect, (req, res) => {
    const { modele } = req.body;
    const immat = req.params.immat;
    if (!modele || !immat) return res.status(400).json({ message: 'Modèle et immatriculation requis' });
    
    db.get('SELECT * FROM vehicules WHERE immat = ? AND createur = ?', [immat, req.user.username], (err, existing) => {
        if (err) return res.status(500).json({ message: err.message });
        if (existing) {
            db.run(`UPDATE vehicules SET modele = ? WHERE immat = ? AND createur = ?`, [modele, immat, req.user.username], (err2) => {
                if (err2) return res.status(500).json({ message: err2.message });
                res.json({ message: 'Véhicule mis à jour' });
            });
        } else {
            db.run(`INSERT INTO vehicules (createur, modele, immat) VALUES (?, ?, ?)`, [req.user.username, modele, immat], (err2) => {
                if (err2) return res.status(500).json({ message: err2.message });
                res.json({ message: 'Véhicule créé' });
            });
        }
    });
});

// DELETE
router.delete('/:id', (req, res) => {
    db.run('DELETE FROM vehicules WHERE id = ? AND createur = ?', [req.params.id, req.user.username], function(err) {
        if (err) return res.status(500).json({ message: err.message });
        res.json({ message: 'Véhicule supprimé' });
    });
});

module.exports = router;