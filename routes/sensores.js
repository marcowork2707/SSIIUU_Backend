const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const mongoose = require('mongoose');

// Modelo simple para datos de sensores (en memoria para el trabajo teórico)
// No usamos base de datos para no contaminar el proyecto de laboratorio
let datosEnMemoria = [];

// POST /api/sensores/data - Recibir datos de sensores (PARA TRABAJO TEÓRICO)
// Endpoint protegido con autenticación JWT
router.post('/data', verificarToken, async (req, res) => {
  try {
    const { sensor_id, sensor_type, value, unit, timestamp, location } = req.body;

    // Validar datos requeridos
    if (!sensor_id || !sensor_type || value === undefined || !unit) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos: sensor_id, sensor_type, value, unit' 
      });
    }

    // Crear registro con información del usuario autenticado
    const registro = {
      id: datosEnMemoria.length + 1,
      sensor_id,
      sensor_type,
      value: parseFloat(value),
      unit,
      timestamp: timestamp || new Date().toISOString(),
      location: location || 'Sin ubicación',
      received_at: new Date().toISOString(),
      received_by: req.usuario.email // Usuario que envió los datos
    };

    // Guardar en memoria
    datosEnMemoria.push(registro);

    // Mantener solo los últimos 1000 registros en memoria
    if (datosEnMemoria.length > 1000) {
      datosEnMemoria = datosEnMemoria.slice(-1000);
    }

    console.log(`📊 Dato de sensor recibido: ${sensor_type} = ${value} ${unit} (Usuario: ${req.usuario.nombre})`);

    res.status(201).json({
      success: true,
      message: 'Datos de sensor guardados correctamente',
      data: registro
    });

  } catch (error) {
    console.error('❌ Error al guardar datos de sensor:', error);
    res.status(500).json({ 
      error: 'Error al procesar datos del sensor',
      details: error.message 
    });
  }
});

// GET /api/sensores/data - Obtener datos de sensores
router.get('/data', verificarToken, async (req, res) => {
  try {
    const { sensor_type, limit = 100 } = req.query;
    
    let datos = datosEnMemoria;

    // Filtrar por tipo de sensor si se especifica
    if (sensor_type) {
      datos = datos.filter(d => d.sensor_type === sensor_type);
    }

    // Aplicar límite
    const limitNum = parseInt(limit);
    datos = datos.slice(-limitNum);

    res.json({
      success: true,
      count: datos.length,
      total_stored: datosEnMemoria.length,
      data: datos
    });

  } catch (error) {
    console.error('❌ Error al obtener datos:', error);
    res.status(500).json({ 
      error: 'Error al obtener datos',
      details: error.message 
    });
  }
});

// GET /api/sensores/stats - Obtener estadísticas
router.get('/stats', verificarToken, async (req, res) => {
  try {
    const stats = {
      total_records: datosEnMemoria.length,
      by_type: {}
    };

    // Calcular estadísticas por tipo
    datosEnMemoria.forEach(dato => {
      const tipo = dato.sensor_type;
      if (!stats.by_type[tipo]) {
        stats.by_type[tipo] = {
          count: 0,
          values: []
        };
      }
      stats.by_type[tipo].count++;
      stats.by_type[tipo].values.push(dato.value);
    });

    // Calcular promedios, min y max
    Object.keys(stats.by_type).forEach(tipo => {
      const values = stats.by_type[tipo].values;
      if (values.length > 0) {
        stats.by_type[tipo].avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
        stats.by_type[tipo].min = Math.min(...values).toFixed(2);
        stats.by_type[tipo].max = Math.max(...values).toFixed(2);
      }
      delete stats.by_type[tipo].values; // No enviar todos los valores
    });

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Error al calcular estadísticas:', error);
    res.status(500).json({ 
      error: 'Error al calcular estadísticas',
      details: error.message 
    });
  }
});

// DELETE /api/sensores/data - Limpiar datos (solo para pruebas)
router.delete('/data', verificarToken, async (req, res) => {
  try {
    const totalBorrado = datosEnMemoria.length;
    datosEnMemoria = [];

    res.json({
      success: true,
      message: `${totalBorrado} registros eliminados`,
      deleted_by: req.usuario.email
    });

  } catch (error) {
    console.error('❌ Error al limpiar datos:', error);
    res.status(500).json({ 
      error: 'Error al limpiar datos',
      details: error.message 
    });
  }
});

module.exports = router;
