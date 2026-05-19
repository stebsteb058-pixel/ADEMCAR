const express = require('express');
const db = require('../config/database-sqlite');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.use(protect);

// ========== GET toutes les réservations ==========
router.get('/', async (req, res) => {
    try {
        let sql = 'SELECT * FROM reservations';
        let params = [];
        
        if (req.user.role !== 'admin') {
            sql += ' WHERE createur = ?';
            params.push(req.user.username);
        }
        
        sql += ' ORDER BY dateDebut DESC';
        
        const result = await db.execute({ sql, args: params });
        res.json(result.rows || []);
        
    } catch (err) {
        console.error('Erreur GET reservations:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// ========== GET réservation par ID ==========
router.get('/:id', async (req, res) => {
    try {
        const result = await db.execute({
            sql: 'SELECT * FROM reservations WHERE id = ?',
            args: [req.params.id]
        });
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Réservation non trouvée' });
        }
        
        res.json(result.rows[0]);
        
    } catch (err) {
        console.error('Erreur GET reservation:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// ========== POST créer une réservation ==========
router.post('/', async (req, res) => {
    const { client, tel, vehiculeId, vehiculeNom, dateDebut, dateFin, statut, notes } = req.body;
    
    if (!client || !vehiculeId || !dateDebut || !dateFin) {
        return res.status(400).json({ message: 'Client, véhicule, date début et date fin requis' });
    }
    
    try {
        const result = await db.execute({
            sql: `INSERT INTO reservations (client, tel, vehiculeId, vehiculeNom, dateDebut, dateFin, statut, notes, createur)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [client, tel || '', vehiculeId, vehiculeNom || '', dateDebut, dateFin, statut || 'en_attente', notes || '', req.user.username]
        });
        
        res.status(201).json({ 
            id: Number(result.lastInsertRowid),
            message: 'Réservation créée avec succès'
        });
        
    } catch (err) {
        console.error('Erreur POST reservation:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// ========== PUT modifier une réservation ==========
router.put('/:id', async (req, res) => {
    const { client, tel, vehiculeId, vehiculeNom, dateDebut, dateFin, statut, notes } = req.body;
    
    try {
        await db.execute({
            sql: `UPDATE reservations SET 
                  client = ?, tel = ?, vehiculeId = ?, vehiculeNom = ?, 
                  dateDebut = ?, dateFin = ?, statut = ?, notes = ?
                  WHERE id = ?`,
            args: [client, tel || '', vehiculeId, vehiculeNom || '', dateDebut, dateFin, statut || 'en_attente', notes || '', req.params.id]
        });
        
        res.json({ message: 'Réservation mise à jour' });
        
    } catch (err) {
        console.error('Erreur PUT reservation:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// ========== DELETE supprimer une réservation ==========
router.delete('/:id', async (req, res) => {
    try {
        await db.execute({
            sql: 'DELETE FROM reservations WHERE id = ?',
            args: [req.params.id]
        });
        
        res.json({ message: 'Réservation supprimée' });
        
    } catch (err) {
        console.error('Erreur DELETE reservation:', err.message);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
