// ========== DATABASE-SQLITE.JS CORRIGÉ ==========

const bcrypt = require('bcryptjs');
const { createClient } = require('@libsql/client');

// Configuration Turso
const db = createClient({
    url: process.env.TURSO_DATABASE_URL || 'libsql://adem-rent-car-db-stebsteb058-pixel.aws-us-east-2.turso.io',
    authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('✅ Connecté à Turso (SQLite cloud)');

// ========== FONCTION POUR CRÉER LES UTILISATEURS PAR DÉFAUT ==========
async function creerUtilisateursParDefaut() {
    const utilisateurs = [
        { username: 'admin', password: 'admin123', role: 'admin', company: 'Adem Rent Car' },
        { username: 'marii', password: 'sous1', role: 'sous_traitant', company: 'Marii' },
        { username: 'jamel', password: 'sous2', role: 'sous_traitant', company: 'Jamel' },
        { username: 'chokri', password: 'sous3', role: 'sous_traitant', company: 'Chokri' },
        { username: 'tmim', password: 'sous4', role: 'sous_traitant', company: 'Tmim' },
        { username: 'nader', password: 'sous5', role: 'sous_traitant', company: 'Nader' },
        { username: 'mouhamed', password: 'sous6', role: 'sous_traitant', company: 'Mouhamed' },
        { username: 'wajih', password: 'sous7', role: 'sous_traitant', company: 'Wajih' },
        { username: 'chrif', password: 'sous8', role: 'sous_traitant', company: 'Chrif' },
        { username: 'saiid', password: 'sous9', role: 'sous_traitant', company: 'Saiid' }
    ];

    for (const user of utilisateurs) {
        try {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            await db.execute({
                sql: `INSERT OR IGNORE INTO users (username, password, role, company) VALUES (?, ?, ?, ?)`,
                args: [user.username, hashedPassword, user.role, user.company]
            });
        } catch (error) {
            console.error(`Erreur création utilisateur ${user.username}:`, error.message);
        }
    }
    console.log('✅ Utilisateurs par défaut créés/vérifiés');
}

// ========== FONCTION D'INITIALISATION DE LA BASE ==========
async function initialiserBaseDeDonnees() {
    try {
        // 1. Table users
        await db.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT,
                role TEXT,
                company TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Table users vérifiée/créée');

        // 2. Table counters
        await db.execute(`
            CREATE TABLE IF NOT EXISTS counters (
                name TEXT PRIMARY KEY,
                value INTEGER
            )
        `);
        
        await db.execute(`
            INSERT OR IGNORE INTO counters (name, value) VALUES ('contrat_num', 1)
        `);
        console.log('✅ Table counters vérifiée/créée');

        // 3. Table contrats
        await db.execute(`
            CREATE TABLE IF NOT EXISTS contrats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                numero_contrat TEXT UNIQUE,
                createur TEXT,
                createurNom TEXT,
                dateCreation DATETIME,
                nom TEXT, prenom TEXT, dateNaiss TEXT, nationalite TEXT,
                cin TEXT, cinDate TEXT, permis TEXT, permisDate TEXT,
                adresse TEXT, tel TEXT, dateEntree TEXT,
                cond2_nom TEXT, cond2_prenom TEXT, cond2_naissance TEXT,
                cond2_nationalite TEXT, cond2_cin TEXT, cond2_cinDate TEXT,
                cond2_permis TEXT, cond2_permisDate TEXT, cond2_adresse TEXT,
                cond2_tel TEXT, cond2_dateEntree TEXT,
                modele TEXT, immat TEXT, kmsDepart INTEGER, kmsRetour INTEGER,
                carburant TEXT, niveauCarbu TEXT,
                roueSecours INTEGER, cric INTEGER, radio INTEGER, enjoliveur INTEGER,
                retroviseurs INTEGER, climatiseur INTEGER, gps INTEGER, siegeBebe INTEGER,
                dateDepart TEXT, heureDepart TEXT, dateRetour TEXT, heureRetour TEXT,
                nbJours INTEGER, prixJournalier REAL, locationHT REAL,
                assuranceRC REAL, assurancePers REAL, penalite REAL,
                tva REAL, totalTTC REAL, lieu TEXT, dateSignature TEXT, dommages TEXT 
            )
        `);
        console.log('✅ Table contrats vérifiée/créée');

        // 4. Table clients
        await db.execute(`
            CREATE TABLE IF NOT EXISTS clients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                createur TEXT,
                type TEXT,
                nom TEXT, prenom TEXT, dateNaiss TEXT, nationalite TEXT,
                cin TEXT, cinDate TEXT, permis TEXT, permisDate TEXT,
                adresse TEXT, tel TEXT, dateEntree TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Table clients vérifiée/créée');

        // 5. Table vehicules
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

        // 6. Table historique_contrats
        await db.execute(`
            CREATE TABLE IF NOT EXISTS historique_contrats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contrat_numero TEXT,
                dateModification DATETIME,
                ancienne_dateRetour TEXT,
                nouvelle_dateRetour TEXT,
                ancien_kmsRetour INTEGER,
                nouveau_kmsRetour INTEGER,
                historique TEXT,
                modifie_par TEXT
            )
        `);
        console.log('✅ Table historique_contrats vérifiée/créée');

        // 7. Table reservations
        await db.execute(`
            CREATE TABLE IF NOT EXISTS reservations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client TEXT NOT NULL,
                tel TEXT,
                vehiculeId INTEGER NOT NULL,
                vehiculeNom TEXT,
                dateDebut TEXT NOT NULL,
                dateFin TEXT NOT NULL,
                statut TEXT DEFAULT 'en_attente',
                notes TEXT,
                dateCreation DATETIME DEFAULT CURRENT_TIMESTAMP,
                createur TEXT
            )
        `);
        console.log('✅ Table reservations vérifiée/créée');

        // 8. Créer les utilisateurs par défaut
        await creerUtilisateursParDefaut();

        console.log('🎉 Base de données initialisée avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation :', error.message);
    }
}

// Lancer l'initialisation
initialiserBaseDeDonnees();

// Exporter la db
module.exports = db;
