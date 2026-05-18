const express = require('express');
const db = require('../config/database-sqlite');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.use(protect);

// GET all contrats
router.get('/', (req, res) => {
    let query = 'SELECT * FROM contrats';
    let params = [];
    if (req.user.role !== 'admin') {
        query += ' WHERE createur = ?';
        params.push(req.user.username);
    }
    query += ' ORDER BY dateCreation DESC';
    db.all(query, params, (err, contrats) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json(contrats || []);
    });
});

// GET contrat par numéro
router.get('/:numero', (req, res) => {
    db.get('SELECT * FROM contrats WHERE numero_contrat = ?', [req.params.numero], (err, contrat) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!contrat) return res.status(404).json({ message: 'Contrat non trouvé' });
        if (req.user.role !== 'admin' && contrat.createur !== req.user.username) {
            return res.status(403).json({ message: 'Non autorisé' });
        }
        res.json(contrat);
    });
});

// POST création contrat (avec sauvegarde client, second conducteur et véhicule)
router.post('/', (req, res) => {
    const data = req.body;
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        db.get('SELECT value FROM counters WHERE name = "contrat_num"', (err, row) => {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ message: err.message });
            }
            
            let nextNum = row.value;
            const year = new Date().getFullYear().toString().slice(-2);
            const numero_contrat = `${year}${nextNum.toString().padStart(5, '0')}`;
            
            db.run('UPDATE counters SET value = value + 1 WHERE name = "contrat_num"', (err2) => {
                if (err2) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ message: err2.message });
                }
                
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
                    data.dateDepart, data.heureDepart, data.dateRetour, data.heureRetour, data.nbJours, data.prixJournalier,  data.locationHT,
                    data.assuranceRC, data.assurancePers, data.penalite, data.tva, data.totalTTC, data.lieu, data.dateSignature, data.dommages
                ];
                
                db.run(queryContrat, paramsContrat, function(err3) {
                    if (err3) {
                        db.run('ROLLBACK');
                        console.error('Erreur insertion contrat:', err3);
                        return res.status(500).json({ message: err3.message });
                    }
                    
                    const contratId = this.lastID;
                    
                    // Fonction générique pour sauvegarder un client
                    const saveClient = (clientData, type, callback) => {
                        if (!clientData.cin) return callback(null);
                        db.get('SELECT id FROM clients WHERE cin = ? AND createur = ?', [clientData.cin, req.user.username], (err4, existing) => {
                            if (err4) return callback(err4);
                            if (existing) {
                                db.run(`UPDATE clients SET 
                                    nom=?, prenom=?, tel=?, adresse=?, dateNaiss=?, nationalite=?, 
                                    permis=?, permisDate=?, cinDate=?, dateEntree=?, type=?
                                    WHERE cin=? AND createur=?`,
                                    [clientData.nom, clientData.prenom, clientData.tel, clientData.adresse, clientData.dateNaiss,
                                     clientData.nationalite, clientData.permis, clientData.permisDate, clientData.cinDate,
                                     clientData.dateEntree, type, clientData.cin, req.user.username],
                                    (err5) => callback(err5));
                            } else {
                                db.run(`INSERT INTO clients (
                                    createur, type, nom, prenom, cin, tel, adresse, dateNaiss, nationalite,
                                    permis, permisDate, cinDate, dateEntree
                                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                                    [req.user.username, type, clientData.nom, clientData.prenom, clientData.cin,
                                     clientData.tel, clientData.adresse, clientData.dateNaiss, clientData.nationalite,
                                     clientData.permis, clientData.permisDate, clientData.cinDate, clientData.dateEntree],
                                    (err5) => callback(err5));
                            }
                        });
                    };
                    
                    // 1. Locataire principal
                    const locataire = {
                        nom: data.nom, prenom: data.prenom, cin: data.cin, tel: data.tel,
                        adresse: data.adresse, dateNaiss: data.dateNaiss, nationalite: data.nationalite,
                        permis: data.permis, permisDate: data.permisDate, cinDate: data.cinDate,
                        dateEntree: data.dateEntree
                    };
                    
                    // 2. Second conducteur (si cond2_cin renseigné)
                    const secondConducteur = {
                        nom: data.cond2_nom, prenom: data.cond2_prenom, cin: data.cond2_cin, tel: data.cond2_tel,
                        adresse: data.cond2_adresse, dateNaiss: data.cond2_naissance, nationalite: data.cond2_nationalite,
                        permis: data.cond2_permis, permisDate: data.cond2_permisDate, cinDate: data.cond2_cinDate,
                        dateEntree: data.cond2_dateEntree
                    };
                    
                    // 3. Sauvegarde du véhicule
                    const saveVehicle = (callback) => {
                        if (!data.immat) return callback(null);
                        db.get('SELECT id FROM vehicules WHERE immat = ? AND createur = ?', [data.immat, req.user.username], (err4, existing) => {
                            if (err4) return callback(err4);
                            if (existing) {
                                db.run('UPDATE vehicules SET modele = ? WHERE immat = ? AND createur = ?',
                                    [data.modele, data.immat, req.user.username],
                                    (err5) => callback(err5));
                            } else {
                                db.run('INSERT INTO vehicules (createur, modele, immat) VALUES (?,?,?)',
                                    [req.user.username, data.modele, data.immat],
                                    (err5) => callback(err5));
                            }
                        });
                    };
                    
                    // Exécution séquentielle
                    saveClient(locataire, 'locataire', (errClient) => {
                        if (errClient) {
                            db.run('ROLLBACK');
                            console.error('Erreur sauvegarde locataire:', errClient);
                            return res.status(500).json({ message: 'Erreur sauvegarde locataire' });
                        }
                        saveClient(secondConducteur, 'conducteur', (errCond) => {
                            if (errCond) {
                                db.run('ROLLBACK');
                                console.error('Erreur sauvegarde second conducteur:', errCond);
                                return res.status(500).json({ message: 'Erreur sauvegarde second conducteur' });
                            }
                            saveVehicle((errVehicle) => {
                                if (errVehicle) {
                                    db.run('ROLLBACK');
                                    console.error('Erreur sauvegarde véhicule:', errVehicle);
                                    return res.status(500).json({ message: 'Erreur sauvegarde véhicule' });
                                }
                                db.run('COMMIT');
                                res.json({ id: contratId, numero_contrat, ...data });
                            });
                        });
                    });
                });
            });
        });
    });
});

// PUT mettre à jour un contrat (prolongation) avec historique
router.put('/:numero', (req, res) => {
    const { numero } = req.params;
    const updates = req.body;
    
    // D'abord, récupérer l'état actuel du contrat
    db.get('SELECT dateRetour, kmsRetour FROM contrats WHERE numero_contrat = ?', [numero], (err, contrat) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!contrat) return res.status(404).json({ message: 'Contrat non trouvé' });
        
        // Vérifier si la modification concerne une prolongation (changement de date ou kms)
        const isProlongation = (updates.dateRetour && updates.dateRetour !== contrat.dateRetour) ||
                               (updates.kmsRetour && updates.kmsRetour !== contrat.kmsRetour);
        
        // Préparer la mise à jour
        const fields = Object.keys(updates).map(k => `${k}=?`).join(',');
        const values = Object.values(updates);
        values.push(numero);
        
        db.run(`UPDATE contrats SET ${fields} WHERE numero_contrat = ?`, values, function(updateErr) {
            if (updateErr) return res.status(500).json({ message: updateErr.message });
            if (this.changes === 0) return res.status(404).json({ message: 'Contrat non trouvé' });
            
            // Si c'est une prolongation, insérer dans l'historique
            if (isProlongation) {
                const ancienneDate = contrat.dateRetour || '';
                const nouvelleDate = updates.dateRetour || contrat.dateRetour;
                const ancienKms = contrat.kmsRetour || 0;
                const nouveauKms = updates.kmsRetour !== undefined ? updates.kmsRetour : ancienKms;
                
                db.run(`INSERT INTO historique_contrats (
                    contrat_numero, dateModification, ancienne_dateRetour, nouvelle_dateRetour,
                    ancien_kmsRetour, nouveau_kmsRetour, modifie_par,historique
                ) VALUES (?, ?, ?, ?, ?, ?, ?,?)`,
                    [numero, new Date().toISOString(), ancienneDate, nouvelleDate, ancienKms, nouveauKms, req.user.username],
                    (histErr) => {
                        if (histErr) console.error('Erreur insertion historique:', histErr);
                        // On ne bloque pas la réponse même si l'historique échoue
                        res.json({ message: 'Contrat mis à jour avec historique' });
                    });
            } else {
                res.json({ message: 'Contrat mis à jour' });
            }
        });
    });
});
// GET historique d'un contrat
router.get('/:numero/historique', (req, res) => {
    const { numero } = req.params;
    db.all('SELECT * FROM historique_contrats WHERE contrat_numero = ? ORDER BY dateModification DESC', [numero], (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json(rows || []);
    });
});
router.delete('/:numero', (req, res) => {
    db.run('DELETE FROM contrats WHERE numero_contrat = ?', [req.params.numero], function(err) {
        if (err) return res.status(500).json({ message: err.message });
        if (this.changes === 0) return res.status(404).json({ message: 'Contrat non trouvé' });
        res.json({ message: 'Contrat supprimé' });
    });
});

module.exports = router;