const express = require('express');
const db = require('../config/database-sqlite');
const { protect } = require('../middleware/auth');
const router = express.Router();

// ========== GET tous les contrats ==========
router.get('/', protect, async (req, res) => {
    try {
        let sql = 'SELECT * FROM contrats';
        let params = [];
        
        // Filtrer par créateur si ce n'est pas admin
        if (req.user.role !== 'admin') {
            sql += ' WHERE createur = ?';
            params.push(req.user.username);
        }
        
        sql += ' ORDER BY dateDepart DESC';
        
        const result = await db.execute({ sql, args: params });
        
        // ✅ Toujours retourner un tableau
        res.json(result.rows || []);
        
    } catch (error) {
        console.error('Erreur GET contrats:', error.message);
        res.json([]);  // Tableau vide en cas d'erreur
    }
});

// ========== GET un contrat par numéro ==========
router.get('/:numero', protect, async (req, res) => {
    try {
        const result = await db.execute({
            sql: 'SELECT * FROM contrats WHERE numero_contrat = ?',
            args: [req.params.numero]
        });
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Contrat non trouvé' });
        }
        
        res.json(result.rows[0]);
        
    } catch (error) {
        console.error('Erreur GET contrat:', error.message);
        res.status(500).json({ message: error.message });
    }
});

// ========== POST créer un contrat ==========
router.post('/', protect, async (req, res) => {
    try {
        // Générer le numéro de contrat
        const counterResult = await db.execute({
            sql: 'SELECT value FROM counters WHERE name = ?',
            args: ['contrat_num']
        });
        
        let nextNum = 1;
        if (counterResult.rows.length > 0) {
            nextNum = counterResult.rows[0].value + 1;
            await db.execute({
                sql: 'UPDATE counters SET value = ? WHERE name = ?',
                args: [nextNum, 'contrat_num']
            });
        } else {
            await db.execute({
                sql: 'INSERT INTO counters (name, value) VALUES (?, ?)',
                args: ['contrat_num', nextNum]
            });
        }
        
        const numero_contrat = nextNum.toString().padStart(6, '0');
        const data = req.body;
        
        const result = await db.execute({
            sql: `INSERT INTO contrats (
                numero_contrat, createur, createurNom, dateCreation,
                nom, prenom, dateNaiss, nationalite, cin, cinDate, permis, permisDate, adresse, tel, dateEntree,
                cond2_nom, cond2_prenom, cond2_naissance, cond2_nationalite, cond2_cin, cond2_cinDate,
                cond2_permis, cond2_permisDate, cond2_adresse, cond2_tel, cond2_dateEntree,
                modele, immat, kmsDepart, kmsRetour, carburant, niveauCarbu,
                roueSecours, cric, radio, enjoliveur, retroviseurs, climatiseur,
                dateDepart, heureDepart, dateRetour, heureRetour, nbJours, prixJournalier,
                locationHT, assuranceRC, assurancePers, tva, totalTTC, lieu, dateSignature, dommages
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                numero_contrat, req.user.username, req.user.company || req.user.username, new Date().toISOString(),
                data.nom, data.prenom, data.dateNaiss, data.nationalite, data.cin, data.cinDate, data.permis, data.permisDate,
                data.adresse, data.tel, data.dateEntree,
                data.cond2_nom, data.cond2_prenom, data.cond2_naissance, data.cond2_nationalite, data.cond2_cin, data.cond2_cinDate,
                data.cond2_permis, data.cond2_permisDate, data.cond2_adresse, data.cond2_tel, data.cond2_dateEntree,
                data.modele, data.immat, data.kmsDepart, data.kmsRetour, data.carburant, data.niveauCarbu,
                data.roueSecours, data.cric, data.radio, data.enjoliveur, data.retroviseurs, data.climatiseur,
                data.dateDepart, data.heureDepart, data.dateRetour, data.heureRetour, data.nbJours, data.prixJournalier,
                data.locationHT, data.assuranceRC, data.assurancePers, data.tva, data.totalTTC, data.lieu, data.dateSignature, data.dommages
            ]
        });
        
        res.status(201).json({ 
            id: result.lastInsertRowid,
            numero_contrat,
            message: 'Contrat créé avec succès'
        });
        
    } catch (error) {
        console.error('Erreur POST contrat:', error.message);
        res.status(500).json({ message: error.message });
    }
});

// ========== PUT modifier un contrat ==========
router.put('/:numero', protect, async (req, res) => {
    try {
        const updates = req.body;
        const fields = [];
        const values = [];
        
        for (const [key, value] of Object.entries(updates)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
        
        values.push(req.params.numero);
        
        await db.execute({
            sql: `UPDATE contrats SET ${fields.join(', ')} WHERE numero_contrat = ?`,
            args: values
        });
        
        res.json({ message: 'Contrat modifié avec succès' });
        
    } catch (error) {
        console.error('Erreur PUT contrat:', error.message);
        res.status(500).json({ message: error.message });
    }
});

// ========== DELETE supprimer un contrat ==========
router.delete('/:numero', protect, async (req, res) => {
    try {
        await db.execute({
            sql: 'DELETE FROM contrats WHERE numero_contrat = ?',
            args: [req.params.numero]
        });
        
        res.json({ message: 'Contrat supprimé avec succès' });
        
    } catch (error) {
        console.error('Erreur DELETE contrat:', error.message);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
