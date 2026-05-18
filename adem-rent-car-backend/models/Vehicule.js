const express = require('express');
const db = require('../config/database-sqlite');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.use(protect);

// GET tous les véhicules de l'utilisateur
router.get('/', (req, res) => {
    db.all('SELECT * FROM vehicules WHERE createur = ? ORDER BY createdAt DESC', [req.user.username], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Erreur récupération véhicules' });
        }
        res.json(rows || []);
    });
});

// POST création
router.post('/', (req, res) => {
    const { modele, immat } = req.body;
    if (!modele || !immat) return res.status(400).json({ message: 'Modèle et immatriculation requis' });
    db.run(`INSERT INTO vehicules (createur, modele, immat) VALUES (?, ?, ?)`,
        [req.user.username, modele, immat],
        function(err) {
            if (err) return res.status(500).json({ message: err.message });
            res.json({ id: this.lastID, modele, immat });
        });
});

// PUT mise à jour ou création par immatriculation
router.put('/:immat', (req, res) => {
    const { modele, immat } = req.body;
    const immatParam = req.params.immat;
    db.get('SELECT * FROM vehicules WHERE immat = ? AND createur = ?', [immatParam, req.user.username], (err, existing) => {
        if (err) return res.status(500).json({ message: err.message });
        if (existing) {
            db.run(`UPDATE vehicules SET modele = ? WHERE immat = ? AND createur = ?`,
                [modele, immatParam, req.user.username],
                (err) => { if (err) return res.status(500).json({ message: err.message }); res.json({ message: 'Véhicule mis à jour' }); });
        } else {
            db.run(`INSERT INTO vehicules (createur, modele, immat) VALUES (?, ?, ?)`,
                [req.user.username, modele, immatParam],
                (err) => { if (err) return res.status(500).json({ message: err.message }); res.json({ message: 'Véhicule créé' }); });
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