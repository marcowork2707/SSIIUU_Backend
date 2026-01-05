const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB conectado correctamente'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

// Rutas
app.get('/', (req, res) => {
  res.json({ 
    message: 'ANTHEM SafeMove API', 
    version: '1.0.0',
    endpoints: {
      accidentes: '/api/accidentes',
      trafico: '/api/trafico',
      kpis: '/api/kpis',
      puntosMedida: '/api/puntos-medida'
    }
  });
});

// Importar rutas
const accidentesRoutes = require('./routes/accidentes');
const traficoRoutes = require('./routes/trafico');
const kpisRoutes = require('./routes/kpis');
const puntosMedidaRoutes = require('./routes/puntosMedida');

app.use('/api/accidentes', accidentesRoutes);
app.use('/api/trafico', traficoRoutes);
app.use('/api/kpis', kpisRoutes);
app.use('/api/puntos-medida', puntosMedidaRoutes);

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal en el servidor' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
