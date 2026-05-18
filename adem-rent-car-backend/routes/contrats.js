const express = require('express');
const db = require('../config/database-sqlite');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.use(protect);

// ========== GET all contrats (CORRIGÉ) ==========
router.get('/', async (req, res) => {
    try {
        let query = 'SELECT * FROM contrats';
        let params = [];
        if (req.user.role !== 'admin') {
            query += ' WHERE createur = ?';
            params.push(req.user.username);
        }
        query += ' ORDER BY dateCreation DESC';
        
        const result = await db.execute({ sql: query, args: params });
        res.json(result.rows || []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ========== GET contrat par numéro (CORRIGÉ) ==========
router.get('/:numero', async (req, res) => {
    try {
        const result = await db.execute({
            sql: 'SELECT * FROM contrats WHERE numero_contrat = ?',
            args: [req.params.numero]
        });
        
        const contrat = result.rows[0];
        if (!contrat) return res.status(404).json({ message: 'Contrat non trouvé' });
        if (req.user.role !== 'admin' && contrat.createur !== req.user.username) {
            return res.status(403).json({ message: 'Non autorisé' });
        }
        res.json(contrat);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ========== POST création contrat (CORRIGÉ) ==========
router.post('/', async (req, res) => {
    const data = req.body;
    
    try {
        // Récupérer le compteur
        const counterResult = await db.execute({
            sql: 'SELECT value FROM counters WHERE name = "contrat_num"'
        });
        
        let nextNum = counterResult.rows[0]?.value || 1;
        const year = new Date().getFullYear().toString().slice(-2);
        const numero_contrat = `${year}${nextNum.toString().padStart(5, '0')}`;
        
        // Incrémenter le compteur
        await db.execute({
            sql: 'UPDATE counters SET value = value + 1 WHERE name = "contrat_num"'
        });
        
        // Insertion du contrat (55 colonnes)
        const queryContrat = `INSERT INTO contrats (
            numero_contrat, createur, createurNom, dateCreation,
            nom, prenom, dateNaiss, nationalite, cin, cinDate, permis, permisDate, adresse, tel, dateEntree,
            cond2_nom, cond2_prenom, cond2_naissance, cond2_nationalite, cond2_cin, cond2_cinDate,
            cond2_permis, cond2_permisDate, cond2_adresse, cond2_tel, cond2_dateEntree,
            modele, immat, kmsDepart, kmsRetour, carburant, niveauCarbu,
            roueSecours, cric, radio, enjoliveur, retroviseurs, climatiseur, gps, siegeBebe,
            dateDepart, heureDepart, dateRetour, heureRetour, nbJours, prixJournalier, locationHT,
            assuranceRC, assurancePers, penalite, tva, totalTTC, lieu, dateSignature, dommages
        ) VALUES (${Array(55).fill('?').join(',')})`;
        
        const paramsContrat = [
            numero_contrat, req.user.username, req.user.company, new Date().toISOString(),
            data.nom, data.prenom, data.dateNaiss, data.nationalite, data.cin, data.cinDate, data.permis, data.permisDate, data.adresse, data.tel, data.dateEntree,
            data.cond2_nom, data.cond2_prenom, data.cond2_naissance, data.cond2_nationalite, data.cond2_cin, data.cond2_cinDate,
            data.cond2_permis, data.cond2_permisDate, data.cond2_adresse, data.cond2_tel, data.cond2_dateEntree,
            data.modele, data.immat, data.kmsDepart, data.kmsRetour, data.carburant, data.niveauCarbu,
            data.roueSecours || 0, data.cric || 0, data.radio || 0, data.enjoliveur || 0, data.retroviseurs || 0, data.climatiseur || 0, data.gps || 0, data.siegeBebe || 0,
            data.dateDepart, data.heureDepart, data.dateRetour, data.heureRetour, data.nbJours, data.prixJournalier, data.locationHT,
            data.assuranceRC, data.assurancePers, data.penalite, data.tva, data.totalTTC, data.lieu, data.dateSignature, data.dommages
        ];
        
        const contratResult = await db.execute({ sql: queryContrat, args: paramsContrat });
        const contratId = contratResult.lastInsertRowid;
        
        // Fonction pour sauvegarder un client
        const saveClient = async (clientData, type) => {
            if (!clientData.cin) return null;
            
            const existingResult = await db.execute({
                sql: 'SELECT id FROM clients WHERE cin = ? AND createur = ?',
                args: [clientData.cin, req.user.username]
            });
            
            const existing = existingResult.rows[0];
            
            if (existing) {
                await db.execute({
                    sql: `UPDATE clients SET 
                        nom=?, prenom=?, tel=?, adresse=?, dateNaiss=?, nationalite=?, 
                        permis=?, permisDate=?, cinDate=?, dateEntree=?, type=?
                        WHERE cin=? AND createur=?`,
                    args: [clientData.nom, clientData.prenom, clientData.tel, clientData.adresse, clientData.dateNaiss,
                           clientData.nationalite, clientData.permis, clientData.permisDate, clientData.cinDate,
                           clientData.dateEntree, type, clientData.cin, req.user.username]
                });
            } else {
                await db.execute({
                    sql: `INSERT INTO clients (
                        createur, type, nom, prenom, cin, tel, adresse, dateNaiss, nationalite,
                        permis, permisDate, cinDate, dateEntree
                    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                    args: [req.user.username, type, clientData.nom, clientData.prenom, clientData.cin,
                           clientData.tel, clientData.adresse, clientData.dateNaiss, clientData.nationalite,
                           clientData.permis, clientData.permisDate, clientData.cinDate, clientData.dateEntree]
                });
            }
        };
        
        // Fonction pour sauvegarder le véhicule
        const saveVehicle = async () => {
            if (!data.immat) return null;
            
            const existingResult = await db.execute({
                sql: 'SELECT id FROM vehicules WHERE immat = ? AND createur = ?',
                args: [data.immat, req.user.username]
            });
            
            const existing = existingResult.rows[0];
            
            if (existing) {
                await db.execute({
                    sql: 'UPDATE vehicules SET modele = ? WHERE immat = ? AND createur = ?',
                    args: [data.modele, data.immat, req.user.username]
                });
            } else {
                await db.execute({
                    sql: 'INSERT INTO vehicules (createur, modele, immat) VALUES (?,?,?)',
                    args: [req.user.username, data.modele, data.immat]
                });
            }
        };
        
        // Exécution séquentielle
        const locataire = {
            nom: data.nom, prenom: data.prenom, cin: data.cin, tel: data.tel,
            adresse: data.adresse, dateNaiss: data.dateNaiss, nationalite: data.nationalite,
            permis: data.permis, permisDate: data.permisDate, cinDate: data.cinDate,
            dateEntree: data.dateEntree
        };
        
        const secondConducteur = {
            nom: data.cond2_nom, prenom: data.cond2_prenom, cin: data.cond2_cin, tel: data.cond2_tel,
            adresse: data.cond2_adresse, dateNaiss: data.cond2_naissance, nationalite: data.cond2_nationalite,
            permis: data.cond2_permis, permisDate: data.cond2_permisDate, cinDate: data.cond2_cinDate,
            dateEntree: data.cond2_dateEntree
        };
        
        await saveClient(locataire, 'locataire');
        await saveClient(secondConducteur, 'conducteur');
        await saveVehicle();
        
        res.json({ id: contratId, numero_contrat, ...data });
        
    } catch (error) {
        console.error('Erreur création contrat:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========== PUT mettre à jour un contrat (CORRIGÉ) ==========
router.put('/:numero', async (req, res) => {
    const { numero } = req.params;
    const updates = req.body;
    
    try {
        // Récupérer l'état actuel du contrat
        const contratResult = await db.execute({
            sql: 'SELECT dateRetour, kmsRetour FROM contrats WHERE numero_contrat = ?',
            args: [numero]
        });
        
        const contrat = contratResult.rows[0];
        if (!contrat) return res.status(404).json({ message: 'Contrat non trouvé' });
        
        // Vérifier si c'est une prolongation
        const isProlongation = (updates.dateRetour && updates.dateRetour !== contrat.dateRetour) ||
                               (updates.kmsRetour && updates.kmsRetour !== contrat.kmsRetour);
        
        // Préparer la mise à jour
        const fields = Object.keys(updates).map(k => `${k}=?`).join(',');
        const values = Object.values(updates);
        values.push(numero);
        
        const updateResult = await db.execute({
            sql: `UPDATE contrats SET ${fields} WHERE numero_contrat = ?`,
            args: values
        });
        
        // Si c'est une prolongation, insérer dans l'historique
        if (isProlongation) {
            const ancienneDate = contrat.dateRetour || '';
            const nouvelleDate = updates.dateRetour || contrat.dateRetour;
            const ancienKms = contrat.kmsRetour || 0;
            const nouveauKms = updates.kmsRetour !== undefined ? updates.kmsRetour : ancienKms;
            
            try {
                await db.execute({
                    sql: `INSERT INTO historique_contrats (
                        contrat_numero, dateModification, ancienne_dateRetour, nouvelle_dateRetour,
                        ancien_kmsRetour, nouveau_kmsRetour, modifie_par, historique
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    args: [numero, new Date().toISOString(), ancienneDate, nouvelleDate, ancienKms, nouveauKms, req.user.username, '']
                });
                res.json({ message: 'Contrat mis à jour avec historique' });
            } catch (histErr) {
                console.error('Erreur insertion historique:', histErr);
                res.json({ message: 'Contrat mis à jour mais historique non enregistré' });
            }
        } else {
            res.json({ message: 'Contrat mis à jour' });
        }
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ========== GET historique d'un contrat (CORRIGÉ) ==========
router.get('/:numero/historique', async (req, res) => {
    const { numero } = req.params;
    
    try {
        const result = await db.execute({
            sql: 'SELECT * FROM historique_contrats WHERE contrat_numero = ? ORDER BY dateModification DESC',
            args: [numero]
        });
        res.json(result.rows || []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ========== DELETE contrat (CORRIGÉ) ==========
router.delete('/:numero', async (req, res) => {
    try {
        const result = await db.execute({
            sql: 'DELETE FROM contrats WHERE numero_contrat = ?',
            args: [req.params.numero]
        });
        res.json({ message: 'Contrat supprimé' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
