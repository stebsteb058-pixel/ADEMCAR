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
            CREATE TABLE IF NOT EXISTS clients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                createur TEXT,
                type TEXT,
                nom TEXT,
                prenom TEXT,
                cin TEXT,
                tel TEXT,
                adresse TEXT,
                dateNaiss TEXT,
                nationalite TEXT,
                permis TEXT,
                permisDate TEXT,
                cinDate TEXT,
                dateEntree TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Table clients vérifiée/créée');
    } catch (error) {
        console.error('Erreur création table clients:', error.message);
    }
}

// Exécuter la création de table au démarrage
ensureTableExists();

// ========== GET tous les clients ==========
router.get('/', async (req, res) => {
    try {
        let sql = 'SELECT * FROM clients';
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
        console.error('Erreur GET clients:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// ========== GET un client par ID ==========
router.get('/:id', async (req, res) => {
    try {
        const result = await db.execute({
            sql: 'SELECT * FROM clients WHERE id = ?',
            args: [req.params.id]
        });
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Client non trouvé' });
        }
        
        const client = result.rows[0];
        
        if (req.user.role !== 'admin' && client.createur !== req.user.username) {
            return res.status(403).json({ message: 'Non autorisé' });
        }
        
        res.json(client);
        
    } catch (err) {
        console.error('Erreur GET client:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// ========== GET un client par CIN ==========
router.get('/cin/:cin', async (req, res) => {
    try {
        let sql = 'SELECT * FROM clients WHERE cin = ?';
        let params = [req.params.cin];
        
        if (req.user.role !== 'admin') {
            sql += ' AND createur = ?';
            params.push(req.user.username);
        }
        
        const result = await db.execute({ sql, args: params });
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Client non trouvé' });
        }
        
        res.json(result.rows[0]);
        
    } catch (err) {
        console.error('Erreur GET client par CIN:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// ========== POST créer un client ==========
router.post('/', async (req, res) => {
    const { 
        type, nom, prenom, cin, tel, adresse, dateNaiss, 
        nationalite, permis, permisDate, cinDate, dateEntree 
    } = req.body;
    
    if (!cin) {
        return res.status(400).json({ message: 'CIN requis' });
    }
    
    try {
        // Vérifier si le client existe déjà
        const existing = await db.execute({
            sql: 'SELECT id FROM clients WHERE cin = ? AND createur = ?',
            args: [cin, req.user.username]
        });
        
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: 'Ce client existe déjà' });
        }
        
        const result = await db.execute({
            sql: `INSERT INTO clients (
                createur, type, nom, prenom, cin, tel, adresse, 
                dateNaiss, nationalite, permis, permisDate, cinDate, dateEntree
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                req.user.username, 
                type || 'locataire', 
                nom || '', 
                prenom || '', 
                cin, 
                tel || '', 
                adresse || '', 
                dateNaiss || '', 
                nationalite || '', 
                permis || '', 
                permisDate || '', 
                cinDate || '', 
                dateEntree || ''
            ]
        });
        
        res.status(201).json({ 
            id: Number(result.lastInsertRowid),
            message: 'Client créé avec succès'
        });
        
    } catch (err) {
        console.error('Erreur POST client:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// ========== PUT mettre à jour un client par CIN ==========
router.put('/:cin', async (req, res) => {
    const { 
        nom, prenom, tel, adresse, dateNaiss, nationalite, 
        permis, permisDate, cinDate, dateEntree, type 
    } = req.body;
    const cin = req.params.cin;
    
    if (!cin) {
        return res.status(400).json({ message: 'CIN requis' });
    }
    
    try {
        // Vérifier si le client existe
        const existing = await db.execute({
            sql: 'SELECT * FROM clients WHERE cin = ? AND createur = ?',
            args: [cin, req.user.username]
        });
        
        if (existing.rows.length > 0) {
            // Mise à jour
            await db.execute({
                sql: `UPDATE clients SET 
                    nom = ?, prenom = ?, tel = ?, adresse = ?, 
                    dateNaiss = ?, nationalite = ?, permis = ?, 
                    permisDate = ?, cinDate = ?, dateEntree = ?, type = ?
                    WHERE cin = ? AND createur = ?`,
                args: [
                    nom || '', prenom || '', tel || '', adresse || '',
                    dateNaiss || '', nationalite || '', permis || '',
                    permisDate || '', cinDate || '', dateEntree || '',
                    type || 'locataire', cin, req.user.username
                ]
            });
            res.json({ message: 'Client mis à jour avec succès' });
        } else {
            // Création
            const result = await db.execute({
                sql: `INSERT INTO clients (
                    createur, type, nom, prenom, cin, tel, adresse, 
                    dateNaiss, nationalite, permis, permisDate, cinDate, dateEntree
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [
                    req.user.username, type || 'locataire', nom || '', prenom || '', 
                    cin, tel || '', adresse || '', dateNaiss || '', nationalite || '', 
                    permis || '', permisDate || '', cinDate || '', dateEntree || ''
                ]
            });
            res.status(201).json({ 
                id: Number(result.lastInsertRowid),
                message: 'Client créé avec succès'
            });
        }
        
    } catch (err) {
        console.error('Erreur PUT client:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// ========== DELETE supprimer un client ==========
router.delete('/:id', async (req, res) => {
    try {
        // Vérifier si le client existe et appartient à l'utilisateur
        const existing = await db.execute({
            sql: 'SELECT * FROM clients WHERE id = ?',
            args: [req.params.id]
        });
        
        if (existing.rows.length === 0) {
            return res.status(404).json({ message: 'Client non trouvé' });
        }
        
        const client = existing.rows[0];
        
        if (req.user.role !== 'admin' && client.createur !== req.user.username) {
            return res.status(403).json({ message: 'Non autorisé' });
        }
        
        // Vérifier si le client a des contrats associés
        const contratsCheck = await db.execute({
            sql: 'SELECT id FROM contrats WHERE cin = ? LIMIT 1',
            args: [client.cin]
        });
        
        if (contratsCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Ce client a des contrats associés, suppression impossible' });
        }
        
        await db.execute({
            sql: 'DELETE FROM clients WHERE id = ?',
            args: [req.params.id]
        });
        
        res.json({ message: 'Client supprimé avec succès' });
        
    } catch (err) {
        console.error('Erreur DELETE client:', err.message);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
