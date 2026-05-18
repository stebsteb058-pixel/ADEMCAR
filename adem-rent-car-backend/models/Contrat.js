const mongoose = require('mongoose');

const contratSchema = new mongoose.Schema({
    numero_contrat: {
        type: String,
        required: true,
        unique: true
    },
    createur: {
        type: String,
        required: true
    },
    createurNom: {
        type: String,
        required: true
    },
    dateCreation: {
        type: Date,
        default: Date.now
    },
    // Locataire
    nom: String,
    prenom: String,
    dateNaiss: Date,
    nationalite: String,
    cin: String,
    cinDate: Date,
    permis: String,
    permisDate: Date,
    adresse: String,
    tel: String,
    dateEntree: Date,
    // Second conducteur
    cond2_nom: String,
    cond2_prenom: String,
    cond2_naissance: Date,
    cond2_nationalite: String,
    cond2_cin: String,
    cond2_cinDate: Date,
    cond2_permis: String,
    cond2_permisDate: Date,
    cond2_adresse: String,
    cond2_tel: String,
    cond2_dateEntree: Date,
    // Véhicule
    modele: String,
    immat: String,
    kmsDepart: Number,
    kmsRetour: Number,
    carburant: String,
    niveauCarbu: String,
    // Équipements
    roueSecours: Boolean,
    cric: Boolean,
    radio: Boolean,
    enjoliveur: Boolean,
    retroviseurs: Boolean,
    climatiseur: Boolean,
    gps: Boolean,
    siegeBebe: Boolean,
    // Location
    dateDepart: Date,
    heureDepart: String,
    dateRetour: Date,
    heureRetour: String,
    nbJours: Number,
    prixJournalier: Number,
   
    locationHT: Number,
    assuranceRC: Number,
    assurancePers: Number,
    penalite: Number,
    tva: Number,
    totalTTC: Number,
    lieu: String,
    dateSignature: Date,
    dommages: String
});

module.exports = mongoose.model('Contrat', contratSchema);