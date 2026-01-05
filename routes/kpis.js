const express = require('express');
const router = express.Router();
const Accidente = require('../models/Accidente');
const { verificarToken, verificarRol } = require('../middleware/auth');

// GET KPIs generales
router.get('/general', async (req, res) => {
  try {
    const totalAccidentes = await Accidente.countDocuments();
    
    const porDistrito = await Accidente.aggregate([
      { $group: { _id: '$distrito', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const porTipo = await Accidente.aggregate([
      { $group: { _id: '$tipo_accidente', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const porHora = await Accidente.aggregate([
      {
        $project: {
          hora: { $substr: ['$hora', 0, 2] }
        }
      },
      { $group: { _id: '$hora', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    const porVehiculo = await Accidente.aggregate([
      { $group: { _id: '$tipo_vehiculo', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      totalAccidentes,
      porDistrito,
      porTipo,
      porHora,
      porVehiculo
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET scoring de riesgo por zona y hora (PROTEGIDO - Solo gestores y admin)
router.get('/riesgo', verificarToken, verificarRol('gestor', 'admin'), async (req, res) => {
  try {
    const { distrito } = req.query;
    
    let matchQuery = {};
    if (distrito) matchQuery.distrito = distrito;
    
    const riesgo = await Accidente.aggregate([
      { $match: matchQuery },
      {
        $project: {
          distrito: 1,
          hora: { $substr: ['$hora', 0, 2] },
          lesividad: 1,
          tipo_accidente: 1
        }
      },
      { 
        $group: { 
          _id: { distrito: '$distrito', hora: '$hora' },
          numeroAccidentes: { $sum: 1 },
          gravesLeves: {
            $sum: { 
              $cond: [
                { $or: [
                  { $eq: ['$lesividad', 'GRAVE'] },
                  { $eq: ['$lesividad', 'FALLECIDO'] },
                  { $eq: ['$cod_lesividad', '03'] },
                  { $eq: ['$cod_lesividad', '04'] }
                ]}, 
                1, 
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          distrito: '$_id.distrito',
          hora: '$_id.hora',
          numeroAccidentes: 1,
          gravesLeves: 1,
          scoreRiesgo: {
            $add: [
              '$numeroAccidentes',
              { $multiply: ['$gravesLeves', 2] }
            ]
          }
        }
      },
      { $sort: { scoreRiesgo: -1 } }
    ]);
    
    res.json(riesgo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET distribución por edad y sexo
router.get('/demografia', async (req, res) => {
  try {
    const porEdad = await Accidente.aggregate([
      { $match: { rango_edad: { $ne: null } } },
      { $group: { _id: '$rango_edad', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const porSexo = await Accidente.aggregate([
      { $match: { sexo: { $ne: null } } },
      { $group: { _id: '$sexo', count: { $sum: 1 } } }
    ]);
    
    res.json({ porEdad, porSexo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET estadísticas por condiciones meteorológicas
router.get('/meteorologia', async (req, res) => {
  try {
    const stats = await Accidente.aggregate([
      { $match: { estado_meteorologico: { $ne: null } } },
      { $group: { _id: '$estado_meteorologico', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
