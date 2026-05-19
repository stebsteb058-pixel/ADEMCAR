const express = require('express');
const db = require('../config/database-sqlite');
const { protect } = require('../middleware/auth');
const router = express.Router();

// ========== CONFIGURATION ==========
let currentContratNumber = null;

async function getContratNumber() {
    try {
        const result = await db.execute({
            sql: 'SELECT value FROM counters WHERE name = ?',
            args: ['contrat_num']
        });
        
        if (result.rows.length > 0) {
            currentContratNumber = result.rows[0].value;
        } else {
            currentContratNumber = 0;
            await db.execute({
                sql: 'INSERT INTO counters (name, value) VALUES (?, ?)',
                args: ['contrat_num', 0]
            });
        }
        return currentContratNumber;
    } catch (error) {
        console.error('Erreur getContratNumber:', error.message);
        return 0;
    }
}

async function updateContratNumber(newNumber) {
    try {
        await db.execute({
            sql: 'UPDATE counters SET value = ? WHERE name = ?',
            args: [newNumber, 'contrat_num']
        });
        currentContratNumber = newNumber;
        return true;
    } catch (error) {
        console.error('Erreur updateContratNumber:', error.message);
        return false;
    }
}

// Appliquer le middleware protect à toutes les routes
router.use(protect);

// ========== GET tous les contrats ==========
router.get('/', async (req, res) => {
    try {
        let sql = 'SELECT * FROM contrats';
        let params = [];
        
        if (req.user.role !== 'admin') {
            sql += ' WHERE createur = ?';
            params.push(req.user.username);
        }
        
        sql += ' ORDER BY dateCreation DESC';
        
        const result = await db.execute({ sql, args: params });
        res.json(result.rows || []);
        
    } catch (err) {
        console.error('Erreur GET contrats:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// ========== GET contrat par numéro ==========
router.get('/:numero', async (req, res) => {
    try {
        const result = await db.execute({
            sql: 'SELECT * FROM contrats WHERE numero_contrat = ?',
            args: [req.params.numero]
        });
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Contrat non trouvé' });
        }
        
        const contrat = result.rows[0];
        
        if (req.user.role !== 'admin' && contrat.createur !== req.user.username) {
            return res.status(403).json({ message: 'Non autorisé' });
        }
        
        res.json(contrat);
        
    } catch (err) {
        console.error('Erreur GET contrat:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// ========== POST création contrat ==========
router.post('/', async (req, res) => {
    const data = req.body;
    
    try {
        // Obtenir le prochain numéro
        let currentNum = await getContratNumber();
        let nextNumber = currentNum + 1;
        let numero_contrat = nextNumber.toString().padStart(6, '0');
        
        console.log('🔢 Génération numéro contrat:', {
            currentNum,
            nextNumber,
            numero_contrat
        });
        
        // Vérifier si le numéro existe déjà (par sécurité)
        const checkResult = await db.execute({
            sql: 'SELECT id FROM contrats WHERE numero_contrat = ?',
            args: [numero_contrat]
        });
        
        if (checkResult.rows.length > 0) {
            // Trouver le prochain numéro disponible
            const maxResult = await db.execute({
                sql: "SELECT MAX(CAST(numero_contrat AS INTEGER)) as max_num FROM contrats WHERE numero_contrat GLOB '[0-9]*'"
            });
            const maxNum = maxResult.rows[0]?.max_num || 0;
            nextNumber = maxNum + 1;
            numero_contrat = nextNumber.toString().padStart(6, '0');
        }
        
        // Insertion du contrat
        const queryContrat = `INSERT INTO contrats (
            numero_contrat, createur, createurNom, dateCreation,
            nom, prenom, dateNaiss, nationalite, cin, cinDate, permis, permisDate, 
            adresse, tel, dateEntree,
            cond2_nom, cond2_prenom, cond2_naissance, cond2_nationalite, 
            cond2_cin, cond2_cinDate, cond2_permis, cond2_permisDate, 
            cond2_adresse, cond2_tel, cond2_dateEntree,
            modele, immat, kmsDepart, kmsRetour, carburant, niveauCarbu,
            roueSecours, cric, radio, enjoliveur, retroviseurs, climatiseur,
            dateDepart, heureDepart, dateRetour, heureRetour, nbJours, 
            prixJournalier, locationHT, assuranceRC, assurancePers,
            tva, totalTTC, lieu, dateSignature, dommages
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
        
        const paramsContrat = [
            numero_contrat, req.user.username, req.user.company || req.user.username, new Date().toISOString(),
            data.nom || '', data.prenom || '', data.dateNaiss || '', data.nationalite || '', 
            data.cin || '', data.cinDate || '', data.permis || '', data.permisDate || '', 
            data.adresse || '', data.tel || '', data.dateEntree || '',
            data.cond2_nom || '', data.cond2_prenom || '', data.cond2_naissance || '', data.cond2_nationalite || '',
            data.cond2_cin || '', data.cond2_cinDate || '', data.cond2_permis || '', data.cond2_permisDate || '',
            data.cond2_adresse || '', data.cond2_tel || '', data.cond2_dateEntree || '',
            data.modele || '', data.immat || '', data.kmsDepart || 0, data.kmsRetour || 0, 
            data.carburant || '', data.niveauCarbu || '',
            data.roueSecours || 0, data.cric || 0, data.radio || 0, 
            data.enjoliveur || 0, data.retroviseurs || 0, data.climatiseur || 0,
            data.dateDepart || '', data.heureDepart || '', data.dateRetour || '', data.heureRetour || '', 
            data.nbJours || 1, data.prixJournalier || 0, data.locationHT || 0, 
            data.assuranceRC || 0, data.assurancePers || 0,
            data.tva || 0, data.totalTTC || 0, 
            data.lieu || 'Menzel Bourguiba', data.dateSignature || data.dateDepart || new Date().toISOString().split('T')[0], 
            data.dommages || ''
        ];
        
        await db.execute({ sql: queryContrat, args: paramsContrat });
        
        // Mettre à jour le compteur
        await updateContratNumber(nextNumber);
        
        // Sauvegarder le client (locataire)
        if (data.cin) {
            const locataireResult = await db.execute({
                sql: 'SELECT id FROM clients WHERE cin = ? AND createur = ?',
                args: [data.cin, req.user.username]
            });
            
            if (locataireResult.rows.length === 0) {
                await db.execute({
                    sql: `INSERT INTO clients (createur, type, nom, prenom, cin, tel, adresse, dateNaiss, nationalite, permis, permisDate, cinDate, dateEntree) 
                          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                    args: [req.user.username, 'locataire', data.nom || '', data.prenom || '', data.cin, data.tel || '', 
                           data.adresse || '', data.dateNaiss || '', data.nationalite || '', data.permis || '', 
                           data.permisDate || '', data.cinDate || '', data.dateEntree || '']
                });
            }
        }
        
        // Sauvegarder le second conducteur
        if (data.cond2_cin) {
            const cond2Result = await db.execute({
                sql: 'SELECT id FROM clients WHERE cin = ? AND createur = ?',
                args: [data.cond2_cin, req.user.username]
            });
            
            if (cond2Result.rows.length === 0) {
                await db.execute({
                    sql: `INSERT INTO clients (createur, type, nom, prenom, cin, tel, adresse, dateNaiss, nationalite, permis, permisDate, cinDate, dateEntree) 
                          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                    args: [req.user.username, 'conducteur', data.cond2_nom || '', data.cond2_prenom || '', data.cond2_cin, data.cond2_tel || '', 
                           data.cond2_adresse || '', data.cond2_naissance || '', data.cond2_nationalite || '', data.cond2_permis || '', 
                           data.cond2_permisDate || '', data.cond2_cinDate || '', data.cond2_dateEntree || '']
                });
            }
        }
        
        // Sauvegarder le véhicule
        if (data.immat) {
            const vehiculeResult = await db.execute({
                sql: 'SELECT id FROM vehicules WHERE immat = ? AND createur = ?',
                args: [data.immat, req.user.username]
            });
            
            if (vehiculeResult.rows.length === 0) {
                await db.execute({
                    sql: 'INSERT INTO vehicules (createur, modele, immat) VALUES (?,?,?)',
                    args: [req.user.username, data.modele || '', data.immat]
                });
            }
        }
        
        res.json({ 
            success: true,
            id: Date.now(),
            numero_contrat: numero_contrat,
            ...data 
        });
        
    } catch (err) {
        console.error('Erreur POST contrat:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// ========== PUT modifier un contrat ==========
router.put('/:numero', async (req, res) => {
    const { numero } = req.params;
    const updates = req.body;
    
    try {
        // Récupérer l'ancien contrat
        const oldResult = await db.execute({
            sql: 'SELECT dateRetour, kmsRetour FROM contrats WHERE numero_contrat = ?',
            args: [numero]
        });
        
        if (oldResult.rows.length === 0) {
            return res.status(404).json({ message: 'Contrat non trouvé' });
        }
        
        const contrat = oldResult.rows[0];
        const isProlongation = (updates.dateRetour && updates.dateRetour !== contrat.dateRetour) ||
                               (updates.kmsRetour && updates.kmsRetour !== contrat.kmsRetour);
        
        // Construire la requête UPDATE
        const fields = Object.keys(updates).map(k => `${k}=?`).join(',');
        const values = Object.values(updates);
        values.push(numero);
        
        await db.execute({
            sql: `UPDATE contrats SET ${fields} WHERE numero_contrat = ?`,
            args: values
        });
        
        // Ajouter à l'historique si prolongation
        if (isProlongation) {
            await db.execute({
                sql: `INSERT INTO historique_contrats (
                    contrat_numero, dateModification, ancienne_dateRetour, nouvelle_dateRetour,
                    ancien_kmsRetour, nouveau_kmsRetour, modifie_par, historique
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [numero, new Date().toISOString(), contrat.dateRetour || '', updates.dateRetour || contrat.dateRetour,
                       contrat.kmsRetour || 0, updates.kmsRetour !== undefined ? updates.kmsRetour : contrat.kmsRetour,
                       req.user.username, 'Prolongation']
            });
        }
        
        res.json({ message: 'Contrat mis à jour' });
        
    } catch (err) {
        console.error('Erreur PUT contrat:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// ========== GET historique d'un contrat ==========
router.get('/:numero/historique', async (req, res) => {
    try {
        const result = await db.execute({
            sql: 'SELECT * FROM historique_contrats WHERE contrat_numero = ? ORDER BY dateModification DESC',
            args: [req.params.numero]
        });
        res.json(result.rows || []);
    } catch (err) {
        console.error('Erreur GET historique:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// ========== DELETE contrat ==========
router.delete('/:numero', async (req, res) => {
    try {
        const result = await db.execute({
            sql: 'DELETE FROM contrats WHERE numero_contrat = ?',
            args: [req.params.numero]
        });
        
        res.json({ message: 'Contrat supprimé' });
    } catch (err) {
        console.error('Erreur DELETE contrat:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// ========== Configuration du numéro de départ ==========
router.post('/config/set-start-number', async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Non autorisé' });
    }
    
    const { startNumber } = req.body;
    const lastNumber = parseInt(startNumber);
    
    if (isNaN(lastNumber) || lastNumber < 0) {
        return res.status(400).json({ message: 'Numéro invalide' });
    }
    
    const success = await updateContratNumber(lastNumber);
    if (success) {
        res.json({ success: true, lastNumber: lastNumber });
    } else {
        res.status(500).json({ message: 'Erreur lors de la sauvegarde' });
    }
});

// ========== Obtenir la configuration actuelle ==========
router.get('/config/current', async (req, res) => {
    const lastNumber = await getContratNumber();
    res.json({ lastNumber: lastNumber });
});

module.exports = router;
