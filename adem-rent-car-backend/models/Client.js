const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    createur: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['locataire', 'conducteur'],
        default: 'locataire'
    },
    nom: String,
    prenom: String,
    dateNaiss: Date,
    nationalite: String,
    cin: {
        type: String,
        required: true
    },
    cinDate: Date,
    permis: String,
    permisDate: Date,
    adresse: String,
    tel: String,
    dateEntree: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

clientSchema.index({ createur: 1, cin: 1 }, { unique: true });

module.exports = mongoose.model('Client', clientSchema);