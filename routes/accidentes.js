const express = require('express');
const router = express.Router();
const Accidente = require('../models/Accidente');

// GET todos los accidentes (con paginación y filtros)
router.get('/', async (req, res) => {
  try {
    const { distrito, desde, hasta, tipo, page = 1, limit = 100 } = req.query;
    
    let query = {};
    
    if (distrito) query.distrito = distrito;
    if (tipo) query.tipo_accidente = tipo;
    if (desde || hasta) {
      query.fecha = {};
      if (desde) query.fecha.$gte = new Date(desde);
      if (hasta) query.fecha.$lte = new Date(hasta);
    }
    
    const accidentes = await Accidente.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ fecha: -1 });
    
    const total = await Accidente.countDocuments(query);
    
    res.json({
      accidentes,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET accidentes por distrito
router.get('/distrito/:distrito', async (req, res) => {
  try {
    const accidentes = await Accidente.find({ 
      distrito: req.params.distrito 
    });
    res.json(accidentes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET accidentes en un área (geoespacial)
router.get('/cerca', async (req, res) => {
  try {
    const { lng, lat, radio = 1000 } = req.query;
    
    const accidentes = await Accidente.find({
      coordenadas: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radio)
        }
      }
    });
    
    res.json(accidentes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET mapa de calor (puntos para heatmap)
router.get('/heatmap', async (req, res) => {
  try {
    const { distrito } = req.query;
    let query = {};
    
    if (distrito) query.distrito = distrito;
    
    const accidentes = await Accidente.find(query)
      .select('coordenadas tipo_accidente lesividad')
      .lean();
    
    // Formato para heatmap frontend
    const puntos = accidentes
      .filter(a => a.coordenadas.coordinates[0] !== 0 && a.coordenadas.coordinates[1] !== 0)
      .map(a => ({
        lat: a.coordenadas.coordinates[1],
        lng: a.coordenadas.coordinates[0],
        intensity: a.lesividad === '03' || a.lesividad === '04' ? 1.5 : 1
      }));
    
    res.json(puntos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
