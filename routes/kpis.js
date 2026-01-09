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
          horaNum: {
            $toInt: {
              $arrayElemAt: [
                { $split: ['$hora', ':'] },
                0
              ]
            }
          }
        }
      },
      { $group: { _id: '$horaNum', count: { $sum: 1 } } },
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
    const { distrito, hora } = req.query;
    
    // Primero obtener todos los distritos únicos
    const distritosUnicos = await Accidente.distinct('distrito');
    
    // Generar todas las combinaciones distrito × hora
    const todasCombinaciones = [];
    for (const dist of distritosUnicos) {
      for (let h = 0; h < 24; h++) {
        todasCombinaciones.push({ distrito: dist, hora: h });
      }
    }

    // Calcular datos reales por distrito-hora (SIN filtros, necesitamos todos los datos)
    const datosReales = await Accidente.aggregate([
      {
        $addFields: {
          horaNum: {
            $toInt: {
              $arrayElemAt: [
                { $split: ['$hora', ':'] },
                0
              ]
            }
          },
          lesividadNum: {
            $cond: {
              if: { $eq: [{ $type: '$cod_lesividad' }, 'string'] },
              then: { $toInt: '$cod_lesividad' },
              else: '$cod_lesividad'
            }
          }
        }
      },
      {
        $group: {
          _id: {
            distrito: '$distrito',
            hora: '$horaNum'
          },
          totalAccidentes: { $sum: 1 },
          graves: {
            $sum: {
              $cond: [
                { $or: [
                  { $eq: ['$lesividadNum', 3] },
                  { $eq: ['$lesividad', 'Ingreso superior a 24 horas'] }
                ]}, 
                1, 
                0
              ]
            }
          },
          fallecidos: {
            $sum: {
              $cond: [
                { $or: [
                  { $eq: ['$lesividadNum', 4] },
                  { $eq: ['$lesividad', 'Fallecido 24 horas'] },
                  { $eq: ['$lesividad', 'Fallecido in situ'] }
                ]}, 
                1, 
                0
              ]
            }
          },
          conAlcohol: {
            $sum: {
              $cond: [{ $eq: ['$positiva_alcohol', 'S'] }, 1, 0]
            }
          },
          tiposUnicos: { $addToSet: '$tipo_accidente' }
        }
      }
    ]);

    // Crear un mapa de datos reales
    const mapaReales = {};
    datosReales.forEach(item => {
      const key = `${item._id.distrito}-${item._id.hora}`;
      mapaReales[key] = item;
    });

    // Combinar todas las combinaciones con datos reales
    const scoring = todasCombinaciones.map(combo => {
      const key = `${combo.distrito}-${combo.hora}`;
      const datos = mapaReales[key];

      if (!datos) {
        // No hay datos para esta combinación
        return {
          distrito: combo.distrito,
          hora: combo.hora,
          totalAccidentes: 0,
          graves: 0,
          fallecidos: 0,
          conAlcohol: 0,
          score: 0,
          nivelRiesgo: 'Bajo',
          tendencia: 'N/A',
          probabilidadAccidente: 0
        };
      }

      // Calcular scores
      const densidadScore = datos.totalAccidentes * 2;
      const severidadScore = (datos.graves * 15) + (datos.fallecidos * 30);
      const alcoholScore = datos.conAlcohol * 8;
      const diversidadScore = datos.tiposUnicos.length * 3;
      const scoreTotal = densidadScore + severidadScore + alcoholScore + diversidadScore;
      
      // Normalización logarítmica
      const score = Math.min(Math.round(Math.log10(scoreTotal + 1) * 25 * 10) / 10, 100);

      // Tendencia
      let tendencia = 'Decreciente';
      if (datos.totalAccidentes >= 200) tendencia = 'Creciente';
      else if (datos.totalAccidentes >= 150) tendencia = 'Estable';

      // Nivel de riesgo
      let nivelRiesgo = 'Bajo';
      if (score >= 75) nivelRiesgo = 'Crítico';
      else if (score >= 50) nivelRiesgo = 'Alto';
      else if (score >= 25) nivelRiesgo = 'Medio';

      // Probabilidad
      const probabilidadAccidente = Math.round(Math.min(
        ((datos.totalAccidentes / 250) + (datos.graves / 100) + (datos.fallecidos / 50) + (datos.conAlcohol / 200)) * 100,
        95
      ));

      return {
        distrito: combo.distrito,
        hora: combo.hora,
        totalAccidentes: datos.totalAccidentes,
        graves: datos.graves,
        fallecidos: datos.fallecidos,
        conAlcohol: datos.conAlcohol,
        score,
        nivelRiesgo,
        tendencia,
        probabilidadAccidente
      };
    });

    // NO aplicar filtros aquí, devolver todos los datos para que el frontend filtre

    // Modelo de zonas de alto riesgo con predicción (agregado por distrito completo)
    const zonasRiesgo = await Accidente.aggregate([
      {
        $addFields: {
          lesividadNum: {
            $cond: {
              if: { $eq: [{ $type: '$cod_lesividad' }, 'string'] },
              then: { $toInt: '$cod_lesividad' },
              else: '$cod_lesividad'
            }
          }
        }
      },
      {
        $group: {
          _id: '$distrito',
          totalAccidentes: { $sum: 1 },
          graves: {
            $sum: {
              $cond: [
                { $or: [
                  { $eq: ['$lesividadNum', 3] },
                  { $eq: ['$lesividad', 'Ingreso superior a 24 horas'] }
                ]}, 
                1, 
                0
              ]
            }
          },
          fallecidos: {
            $sum: {
              $cond: [
                { $or: [
                  { $eq: ['$lesividadNum', 4] },
                  { $eq: ['$lesividad', 'Fallecido 24 horas'] },
                  { $eq: ['$lesividad', 'Fallecido in situ'] }
                ]}, 
                1, 
                0
              ]
            }
          },
          conAlcohol: {
            $sum: {
              $cond: [{ $eq: ['$positiva_alcohol', 'S'] }, 1, 0]
            }
          }
        }
      },
      {
        $addFields: {
          // Score total sin normalizar
          scoreTotal: {
            $add: [
              { $multiply: ['$totalAccidentes', 0.3] },
              { $multiply: ['$graves', 8] },
              { $multiply: ['$fallecidos', 20] },
              { $multiply: ['$conAlcohol', 5] }
            ]
          },
          tasaGravedad: {
            $round: [
              {
                $multiply: [
                  { $divide: [
                    { $add: ['$graves', '$fallecidos'] },
                    '$totalAccidentes'
                  ]},
                  100
                ]
              },
              1
            ]
          }
        }
      },
      {
        $addFields: {
          // Aplicar normalización logarítmica (0-100)
          scoreRiesgo: {
            $round: [
              {
                $min: [
                  {
                    $multiply: [
                      { $log10: { $add: ['$scoreTotal', 1] } },
                      25
                    ]
                  },
                  100
                ]
              },
              1
            ]
          }
        }
      },
      { $sort: { scoreRiesgo: -1 } },
      { $limit: 10 },
      {
        $project: {
          distrito: '$_id',
          totalAccidentes: 1,
          graves: 1,
          fallecidos: 1,
          conAlcohol: 1,
          scoreRiesgo: 1,
          tasaGravedad: 1,
          _id: 0
        }
      }
    ]);

    // Patrones horarios de riesgo
    const patronesHorarios = await Accidente.aggregate([
      {
        $addFields: {
          horaNum: {
            $toInt: {
              $arrayElemAt: [
                { $split: ['$hora', ':'] },
                0
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: '$horaNum',
          accidentes: { $sum: 1 }
        }
      },
      { $sort: { accidentes: -1 } },
      { $limit: 5 },
      {
        $project: {
          hora: '$_id',
          accidentes: 1,
          riesgo: {
            $switch: {
              branches: [
                { case: { $gte: ['$accidentes', 2000] }, then: 'Muy Alto' },
                { case: { $gte: ['$accidentes', 1500] }, then: 'Alto' },
                { case: { $gte: ['$accidentes', 1000] }, then: 'Moderado' }
              ],
              default: 'Normal'
            }
          },
          _id: 0
        }
      }
    ]);

    res.json({
      scoring: scoring,  // Enviar TODOS los datos (distrito×hora)
      zonasRiesgo,
      patronesHorarios,
      metadata: {
        totalCombinaciones: scoring.length,
        modelo: 'Predictivo Multifactorial',
        factores: {
          densidad: 'Concentración de accidentes (peso: 2x)',
          severidad: 'Graves (15pts) + Fallecidos (30pts)',
          alcohol: 'Casos con alcohol positivo (8pts)',
          diversidad: 'Variedad de tipos de accidente (3pts)'
        },
        normalizacion: 'Escala logarítmica 0-100',
        criterios: {
          bajo: '0-25 (Verde)',
          medio: '25-50 (Amarillo)',
          alto: '50-75 (Naranja)',
          critico: '75-100 (Rojo)'
        }
      }
    });
  } catch (error) {
    console.error('Error en scoring de riesgo:', error);
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
