const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

// Utiliser SQLite au lieu de MongoDB
// const connectDB = require('./config/database');
// connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/api/auth', require('./routes/auth'));
app.use('/api/contrats', require('./routes/contrats'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/vehicules', require('./routes/vehicules'));
app.use('/api/stats', require('./routes/stats'));

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'API Adem Rent Car fonctionnelle' });
});

app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route non trouvée' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Erreur interne du serveur' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`📁 Base de données SQLite: adem_rent_car.db`);
});
