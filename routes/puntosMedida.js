const express = require('express');
const router = express.Router();
const PuntoMedida = require('../models/PuntoMedida');

// GET todos los puntos de medida
router.get('/', async (req, res) => {
  try {
    const puntos = await PuntoMedida.find();
    res.json(puntos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET punto específico
router.get('/:id', async (req, res) => {
  try {
    const punto = await PuntoMedida.findOne({ id: parseInt(req.params.id) });
    if (!punto) {
      return res.status(404).json({ error: 'Punto no encontrado' });
    }
    res.json(punto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
