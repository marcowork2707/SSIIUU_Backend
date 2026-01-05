const express = require('express');
const router = express.Router();
const Trafico = require('../models/Trafico');

// GET datos de tráfico
router.get('/', async (req, res) => {
  try {
    const { id, desde, hasta, limit = 100 } = req.query;
    
    let query = {};
    if (id) query.id = parseInt(id);
    if (desde || hasta) {
      query.fecha = {};
      if (desde) query.fecha.$gte = new Date(desde);
      if (hasta) query.fecha.$lte = new Date(hasta);
    }
    
    const datos = await Trafico.find(query)
      .limit(parseInt(limit))
      .sort({ fecha: -1 });
    
    res.json(datos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET promedio de tráfico por punto
router.get('/promedio', async (req, res) => {
  try {
    const promedios = await Trafico.aggregate([
      {
        $group: {
          _id: '$id',
          intensidadMedia: { $avg: '$intensidad' },
          ocupacionMedia: { $avg: '$ocupacion' },
          cargaMedia: { $avg: '$carga' },
          velocidadMedia: { $avg: '$vmed' },
          totalRegistros: { $sum: 1 }
        }
      },
      { $sort: { intensidadMedia: -1 } }
    ]);
    
    res.json(promedios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
