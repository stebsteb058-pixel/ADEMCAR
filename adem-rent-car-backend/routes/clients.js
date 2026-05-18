const express = require('express');
const db = require('../config/database-sqlite');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.use(protect);

// GET all clients
router.get('/', (req, res) => {
    db.all('SELECT * FROM clients WHERE createur = ?', [req.user.username], (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json(rows);
    });
});

// POST create client
router.post('/', (req, res) => {
    const { type, nom, prenom, cin, tel, adresse, dateNaiss, nationalite, permis, permisDate, cinDate, dateEntree } = req.body;
    db.run(`INSERT INTO clients (createur, type, nom, prenom, cin, tel, adresse, dateNaiss, nationalite, permis, permisDate, cinDate, dateEntree)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [req.user.username, type, nom, prenom, cin, tel, adresse, dateNaiss, nationalite, permis, permisDate, cinDate, dateEntree],
        function(err) {
            if (err) return res.status(500).json({ message: err.message });
            res.json({ id: this.lastID });
        });
});

// PUT update client by cin
// PUT /clients/:cin  (mise à jour ou création)
router.put('/:cin', protect, (req, res) => {
    const { nom, prenom, tel, adresse, dateNaiss, nationalite, permis, permisDate, cinDate, dateEntree, type } = req.body;
    const cin = req.params.cin;
    if (!cin) return res.status(400).json({ message: 'CIN requis' });
    
    // Vérifier si client existe déjà pour cet utilisateur
    db.get('SELECT * FROM clients WHERE cin = ? AND createur = ?', [cin, req.user.username], (err, existing) => {
        if (err) return res.status(500).json({ message: err.message });
        if (existing) {
            // Mise à jour
            db.run(`UPDATE clients SET nom=?, prenom=?, tel=?, adresse=?, dateNaiss=?, nationalite=?, permis=?, permisDate=?, cinDate=?, dateEntree=?, type=? 
                    WHERE cin=? AND createur=?`,
                [nom, prenom, tel, adresse, dateNaiss, nationalite, permis, permisDate, cinDate, dateEntree, type || 'locataire', cin, req.user.username],
                (err2) => {
                    if (err2) return res.status(500).json({ message: err2.message });
                    res.json({ message: 'Client mis à jour' });
                });
        } else {
            // Création
            db.run(`INSERT INTO clients (createur, type, nom, prenom, cin, tel, adresse, dateNaiss, nationalite, permis, permisDate, cinDate, dateEntree)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [req.user.username, type || 'locataire', nom, prenom, cin, tel, adresse, dateNaiss, nationalite, permis, permisDate, cinDate, dateEntree],
                (err2) => {
                    if (err2) return res.status(500).json({ message: err2.message });
                    res.json({ message: 'Client créé' });
                });
        }
    });
});

// DELETE client
router.delete('/:id', (req, res) => {
    db.run('DELETE FROM clients WHERE id=? AND createur=?', [req.params.id, req.user.username], function(err) {
        if (err) return res.status(500).json({ message: err.message });
        res.json({ message: 'Client supprimé' });
    });
});

module.exports = router;