const express = require('express');
const db = require('../config/database-sqlite');
const { protect } = require('../middleware/auth');
const router = express.Router();

// ========== STATISTIQUES DASHBOARD (CORRIGÉ) ==========
router.get('/', protect, async (req, res) => {
    try {
        // Vérifier que la table contrats existe
        const tableCheck = await db.execute({
            sql: "SELECT name FROM sqlite_master WHERE type='table' AND name='contrats'"
        });
        
        const tableExists = tableCheck.rows.length > 0;
        
        if (!tableExists) {
            return res.json({ 
                totalContrats: 0, 
                totalCA: 0, 
                myContrats: 0, 
                myCA: 0, 
                clients: 0, 
                vehicules: 0 
            });
        }
        
        if (req.user.role === 'admin') {
            // Total contrats (tous les utilisateurs)
            const allResult = await db.execute('SELECT COUNT(*) as total, SUM(totalTTC) as ca FROM contrats');
            const totalContrats = allResult.rows[0]?.total || 0;
            const totalCA = allResult.rows[0]?.ca || 0;
            
            // Mes contrats (admin aussi)
            const myResult = await db.execute({
                sql: 'SELECT COUNT(*) as myTotal, SUM(totalTTC) as myCa FROM contrats WHERE createur = ?',
                args: [req.user.username]
            });
            const myContrats = myResult.rows[0]?.myTotal || 0;
            const myCA = myResult.rows[0]?.myCa || 0;
            
            res.json({
                totalContrats,
                totalCA,
                myContrats,
                myCA
            });
            
        } else {
            // Pour les sous-traitants : voir uniquement leurs données
            
            // Mes contrats
            const myContratsResult = await db.execute({
                sql: 'SELECT COUNT(*) as myTotal, SUM(totalTTC) as myCa FROM contrats WHERE createur = ?',
                args: [req.user.username]
            });
            const myContrats = myContratsResult.rows[0]?.myTotal || 0;
            const myCA = myContratsResult.rows[0]?.myCa || 0;
            
            // Mes clients
            const clientsResult = await db.execute({
                sql: 'SELECT COUNT(*) as nbClients FROM clients WHERE createur = ?',
                args: [req.user.username]
            });
            const clients = clientsResult.rows[0]?.nbClients || 0;
            
            // Mes véhicules
            const vehiculesResult = await db.execute({
                sql: 'SELECT COUNT(*) as nbVehicules FROM vehicules WHERE createur = ?',
                args: [req.user.username]
            });
            const vehicules = vehiculesResult.rows[0]?.nbVehicules || 0;
            
            res.json({
                myContrats,
                myCA,
                clients,
                vehicules
            });
        }
        
    } catch (error) {
        console.error('Dashboard stats error:', error.message);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
