const express = require('express');
const db = require('../config/database-sqlite');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Appliquer le middleware protect à toutes les routes
router.use(protect);

// ========== CREATE TABLE si elle n'existe pas ==========
async function ensureTableExists() {
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS vehicules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                createur TEXT,
                modele TEXT,
                immat TEXT,
               
                annee TEXT,
                carburant TEXT,
                prixJournalier REAL,
                notes TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Table vehicules vérifiée/créée');
    } catch (error) {
        console.error('Erreur création table vehicules:', error.message);
    }
}

// Exécuter la création de table au démarrage
ensureTableExists();

// ========== GET tous les véhicules ==========
router.get('/', async (req, res) => {
    try {
        let sql = 'SELECT * FROM vehicules';
        let params = [];
        
        if (req.user.role !== 'admin') {
            sql += ' WHERE createur = ?';
            params.push(req.user.username);
        }
        
        sql += ' ORDER BY createdAt DESC';
        
        const result = await db.execute({ sql, args: params });
        
        // ✅ Toujours retourner un tableau
        res.json(result.rows || []);
        
    } catch (err) {
        console.error('Erreur GET vehicules:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// ========== GET un véhicule par ID ==========
router.get('/:id', async (req, res) => {
    try {
        const result = await db.execute({
            sql: 'SELECT * FROM vehicules WHERE id = ?',
            args: [req.params.id]
        });
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Véhicule non trouvé' });
        }
        
        const vehicule = result.rows[0];
        
        if (req.user.role !== 'admin' && vehicule.createur !== req.user.username) {
            return res.status(403).json({ message: 'Non autorisé' });
        }
        
        res.json(vehicule);
        
    } catch (err) {
        console.error('Erreur GET vehicule:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// ========== POST créer un véhicule ==========
router.post('/', async (req, res) => {
    const { modele, immat, annee, carburant, prixJournalier, notes } = req.body;
    
    if (!modele || !immat) {
        return res.status(400).json({ message: 'Modèle et immatriculation requis' });
    }
    
    try {
        // Vérifier si l'immatriculation existe déjà pour ce créateur
        const existing = await db.execute({
            sql: 'SELECT id FROM vehicules WHERE immat = ? AND createur = ?',
            args: [immat, req.user.username]
        });
        
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: 'Cette immatriculation existe déjà' });
        }
        
        const result = await db.execute({
            sql: `INSERT INTO vehicules (createur, modele, immat, annee, carburant, prixJournalier, notes) 
                  VALUES (?, ?, ?, ?, ?, ?,  ?)`,
            args: [
                req.user.username, 
                modele, 
                immat, 
               
                annee || '', 
                carburant || 'Essence', 
                prixJournalier || 80, 
                notes || ''
            ]
        });
        
        res.status(201).json({ 
            id: Number(result.lastInsertRowid),
            modele, 
            immat,
            message: 'Véhicule créé avec succès'
        });
        
    } catch (err) {
        console.error('Erreur POST vehicule:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// ========== PUT modifier un véhicule ==========
router.put('/:id', async (req, res) => {
    const { modele, immat,  annee, carburant, prixJournalier, notes } = req.body;
    const vehiculeId = req.params.id;
    
    if (!modele || !immat) {
        return res.status(400).json({ message: 'Modèle et immatriculation requis' });
    }
    
    try {
        // Vérifier si le véhicule existe et appartient à l'utilisateur
        const existing = await db.execute({
            sql: 'SELECT * FROM vehicules WHERE id = ?',
            args: [vehiculeId]
        });
        
        if (existing.rows.length === 0) {
            return res.status(404).json({ message: 'Véhicule non trouvé' });
        }
        
        const vehicule = existing.rows[0];
        
        if (req.user.role !== 'admin' && vehicule.createur !== req.user.username) {
            return res.status(403).json({ message: 'Non autorisé' });
        }
        
        // Vérifier si la nouvelle immatriculation n'est pas déjà utilisée par un autre véhicule
        if (immat !== vehicule.immat) {
            const duplicateCheck = await db.execute({
                sql: 'SELECT id FROM vehicules WHERE immat = ? AND createur = ? AND id != ?',
                args: [immat, req.user.username, vehiculeId]
            });
            
            if (duplicateCheck.rows.length > 0) {
                return res.status(400).json({ message: 'Cette immatriculation est déjà utilisée' });
            }
        }
        
        await db.execute({
            sql: `UPDATE vehicules 
                  SET modele = ?, immat = ?, annee = ?, carburant = ?, prixJournalier = ?, notes = ?
                  WHERE id = ?`,
            args: [modele, immat, annee || '', carburant || 'Essence', prixJournalier || 80, notes || '', vehiculeId]
        });
        
        res.json({ message: 'Véhicule mis à jour avec succès' });
        
    } catch (err) {
        console.error('Erreur PUT vehicule:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// ========== DELETE supprimer un véhicule ==========
router.delete('/:id', async (req, res) => {
    try {
        // Vérifier si le véhicule existe et appartient à l'utilisateur
        const existing = await db.execute({
            sql: 'SELECT * FROM vehicules WHERE id = ?',
            args: [req.params.id]
        });
        
        if (existing.rows.length === 0) {
            return res.status(404).json({ message: 'Véhicule non trouvé' });
        }
        
        const vehicule = existing.rows[0];
        
        if (req.user.role !== 'admin' && vehicule.createur !== req.user.username) {
            return res.status(403).json({ message: 'Non autorisé' });
        }
        
        // Vérifier si le véhicule a des contrats associés
        const contratsCheck = await db.execute({
            sql: 'SELECT id FROM contrats WHERE immat = ? LIMIT 1',
            args: [vehicule.immat]
        });
        
        if (contratsCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Ce véhicule a des contrats associés, suppression impossible' });
        }
        
        await db.execute({
            sql: 'DELETE FROM vehicules WHERE id = ?',
            args: [req.params.id]
        });
        
        res.json({ message: 'Véhicule supprimé avec succès' });
        
    } catch (err) {
        console.error('Erreur DELETE vehicule:', err.message);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
