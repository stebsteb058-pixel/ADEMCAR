const express = require('express');
const db = require('../config/database-sqlite');
const { protect, adminOnly } = require('../middleware/auth');
const router = express.Router();

// ========== GET le numéro du dernier contrat ==========
router.get('/contrat-number', protect, async (req, res) => {
    try {
        const result = await db.execute({
            sql: 'SELECT value FROM counters WHERE name = ?',
            args: ['contrat_num']
        });
        
        let lastNumber = 0;
        if (result.rows.length > 0) {
            lastNumber = result.rows[0].value;
        }
        
        res.json({ lastNumber });
        
    } catch (error) {
        console.error('Erreur GET contrat-number:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ========== POST modifier le numéro du dernier contrat (admin only) ==========
router.post('/contrat-number', protect, adminOnly, async (req, res) => {
    try {
        const { lastNumber } = req.body;
        
        if (lastNumber === undefined || isNaN(lastNumber)) {
            return res.status(400).json({ error: 'Numéro invalide' });
        }
        
        // Vérifier si le compteur existe
        const checkResult = await db.execute({
            sql: 'SELECT value FROM counters WHERE name = ?',
            args: ['contrat_num']
        });
        
        if (checkResult.rows.length > 0) {
            // Mettre à jour
            await db.execute({
                sql: 'UPDATE counters SET value = ? WHERE name = ?',
                args: [lastNumber, 'contrat_num']
            });
        } else {
            // Créer
            await db.execute({
                sql: 'INSERT INTO counters (name, value) VALUES (?, ?)',
                args: ['contrat_num', lastNumber]
            });
        }
        
        res.json({ 
            success: true, 
            lastNumber,
            message: `Numéro mis à jour: ${lastNumber}`
        });
        
    } catch (error) {
        console.error('Erreur POST contrat-number:', error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
