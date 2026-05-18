const express = require('express');
const db = require('../config/database-sqlite');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.use(protect);

// ========== GET all clients (CORRIGÉ) ==========
router.get('/', async (req, res) => {
    try {
        const result = await db.execute({
            sql: 'SELECT * FROM clients WHERE createur = ?',
            args: [req.user.username]
        });
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ========== POST create client (CORRIGÉ) ==========
router.post('/', async (req, res) => {
    try {
        const { type, nom, prenom, cin, tel, adresse, dateNaiss, nationalite, permis, permisDate, cinDate, dateEntree } = req.body;
        
        const result = await db.execute({
            sql: `INSERT INTO clients (createur, type, nom, prenom, cin, tel, adresse, dateNaiss, nationalite, permis, permisDate, cinDate, dateEntree)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [req.user.username, type, nom, prenom, cin, tel, adresse, dateNaiss, nationalite, permis, permisDate, cinDate, dateEntree]
        });
        
        res.json({ id: result.lastInsertRowid });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ========== PUT update client by cin (CORRIGÉ) ==========
router.put('/:cin', protect, async (req, res) => {
    try {
        const { nom, prenom, tel, adresse, dateNaiss, nationalite, permis, permisDate, cinDate, dateEntree, type } = req.body;
        const cin = req.params.cin;
        
        if (!cin) return res.status(400).json({ message: 'CIN requis' });
        
        // Vérifier si client existe déjà pour cet utilisateur
        const result = await db.execute({
            sql: 'SELECT * FROM clients WHERE cin = ? AND createur = ?',
            args: [cin, req.user.username]
        });
        
        const existing = result.rows[0];
        
        if (existing) {
            // Mise à jour
            await db.execute({
                sql: `UPDATE clients SET nom=?, prenom=?, tel=?, adresse=?, dateNaiss=?, nationalite=?, permis=?, permisDate=?, cinDate=?, dateEntree=?, type=? 
                      WHERE cin=? AND createur=?`,
                args: [nom, prenom, tel, adresse, dateNaiss, nationalite, permis, permisDate, cinDate, dateEntree, type || 'locataire', cin, req.user.username]
            });
            res.json({ message: 'Client mis à jour' });
        } else {
            // Création
            await db.execute({
                sql: `INSERT INTO clients (createur, type, nom, prenom, cin, tel, adresse, dateNaiss, nationalite, permis, permisDate, cinDate, dateEntree)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [req.user.username, type || 'locataire', nom, prenom, cin, tel, adresse, dateNaiss, nationalite, permis, permisDate, cinDate, dateEntree]
            });
            res.json({ message: 'Client créé' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ========== DELETE client (CORRIGÉ) ==========
router.delete('/:id', async (req, res) => {
    try {
        await db.execute({
            sql: 'DELETE FROM clients WHERE id=? AND createur=?',
            args: [req.params.id, req.user.username]
        });
        res.json({ message: 'Client supprimé' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
