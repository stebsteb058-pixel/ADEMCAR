const express = require('express');
const db = require('../config/database-sqlite');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/', protect, (req, res) => {
    // Vérifier que les tables existent
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='contrats'", (err, table) => {
        if (err || !table) {
            return res.json({ totalContrats: 0, totalCA: 0, myContrats: 0, myCA: 0, clients: 0, vehicules: 0 });
        }
        
        if (req.user.role === 'admin') {
            // Total contrats (tous)
            db.get('SELECT COUNT(*) as total, SUM(totalTTC) as ca FROM contrats', (err, all) => {
                if (err) return res.status(500).json({ message: err.message });
                // Mes contrats (admin aussi)
                db.get('SELECT COUNT(*) as myTotal, SUM(totalTTC) as myCa FROM contrats WHERE createur = ?', [req.user.username], (err2, my) => {
                    if (err2) return res.status(500).json({ message: err2.message });
                    res.json({
                        totalContrats: all?.total || 0,
                        totalCA: all?.ca || 0,
                        myContrats: my?.myTotal || 0,
                        myCA: my?.myCa || 0
                    });
                });
            });
        } else {
   
            db.get('SELECT COUNT(*) as myTotal, SUM(totalTTC) as myCa FROM contrats WHERE createur = ?', [req.user.username], (err, my) => {
                if (err) return res.status(500).json({ message: err.message });
                db.get('SELECT COUNT(*) as nbClients FROM clients WHERE createur = ?', [req.user.username], (err2, clients) => {
                    if (err2) return res.status(500).json({ message: err2.message });
                    db.get('SELECT COUNT(*) as nbVehicules FROM vehicules WHERE createur = ?', [req.user.username], (err3, vehicules) => {
                        if (err3) return res.status(500).json({ message: err3.message });
                        res.json({
                            myContrats: my?.myTotal || 0,
                            myCA: my?.myCa || 0,
                            clients: clients?.nbClients || 0,
                            vehicules: vehicules?.nbVehicules || 0
                        });
                    });
                });
            });
        }
    });
});

module.exports = router;