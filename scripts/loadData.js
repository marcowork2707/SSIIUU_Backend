const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
require('dotenv').config();

const Accidente = require('../models/Accidente');
const PuntoMedida = require('../models/PuntoMedida');
const Trafico = require('../models/Trafico');

// Función para convertir coordenadas UTM a lat/lng (zona UTM 30N - España)
function utmToLatLng(x, y) {
  // Conversión aproximada usando proyección UTM zona 30N
  // x e y están en metros
  const zone = 30;
  const k0 = 0.9996;
  const e = 0.00669438;
  const e2 = e * e;
  const e3 = e2 * e;
  const e_p2 = e / (1 - e);
  
  x = x - 500000.0; // False Easting
  y = y; // False Northing para hemisferio norte
  
  const m = y / k0;
  const mu = m / (6378137.0 * (1 - e / 4 - 3 * e2 / 64 - 5 * e3 / 256));
  
  const p_rad = (mu + 
    (3 * e / 2 - 27 * e3 / 32) * Math.sin(2 * mu) + 
    (21 * e2 / 16 - 55 * e3 / 32) * Math.sin(4 * mu) + 
    (151 * e3 / 96) * Math.sin(6 * mu));
  
  const p_sin = Math.sin(p_rad);
  const p_cos = Math.cos(p_rad);
  const p_tan = Math.tan(p_rad);
  
  const c1 = e_p2 * p_cos * p_cos;
  const t1 = p_tan * p_tan;
  const r1 = 6378137.0 * (1 - e) / Math.pow(1 - e * p_sin * p_sin, 1.5);
  const n1 = 6378137.0 / Math.sqrt(1 - e * p_sin * p_sin);
  const d = x / (n1 * k0);
  
  const lat = (p_rad - (n1 * p_tan / r1) * 
    (d * d / 2 - (5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * e_p2) * d * d * d * d / 24 + 
    (61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * e_p2 - 3 * c1 * c1) * d * d * d * d * d * d / 720));
  
  const lng = ((d - (1 + 2 * t1 + c1) * d * d * d / 6 + 
    (5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * e_p2 + 24 * t1 * t1) * d * d * d * d * d / 120) / p_cos);
  
  return [
    ((zone - 1) * 6 - 180 + 3 + lng * 180 / Math.PI), // longitud
    (lat * 180 / Math.PI) // latitud
  ];
}

// Cargar accidentes
async function cargarAccidentes() {
  console.log('📊 Cargando accidentes...');
  const results = [];
  const dataPath = path.join(__dirname, '../../Datasets/Anthem_CTC_Accidentalidad.csv');
  
  return new Promise((resolve, reject) => {
    let lineCount = 0;
    let firstLine = true;
    
    fs.createReadStream(dataPath, { encoding: 'utf8' })
      .pipe(csv({ 
        separator: ';',
        mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '').trim() // Eliminar BOM
      }))
      .on('data', (data) => {
        lineCount++;
        try {
          // Función helper para limpiar valores NULL
          const cleanValue = (val) => {
            if (!val || val === 'NULL' || val === 'null' || val.trim() === '') {
              return null;
            }
            return val;
          };
          
          // Parsear fecha (formato: dd/mm/yyyy)
          const fechaStr = data.fecha || '';
          const [dia, mes, año] = fechaStr.split('/');
          const fecha = new Date(`${año}-${mes}-${dia}`);
          
          // Convertir coordenadas UTM a lat/lng
          let coordinates = [0, 0];
          if (data.coordenada_x_utm && data.coordenada_y_utm) {
            const xStr = data.coordenada_x_utm.replace(',', '.');
            const yStr = data.coordenada_y_utm.replace(',', '.');
            const x = parseFloat(xStr);
            const y = parseFloat(yStr);
            if (!isNaN(x) && !isNaN(y) && x > 0 && y > 0) {
              coordinates = utmToLatLng(x, y);
            }
          }
          
          // Solo agregar si tiene expediente válido
          const expediente = cleanValue(data.num_expediente);
          if (!expediente) {
            return;
          }
          
          results.push({
            num_expediente: expediente,
            fecha: fecha,
            hora: cleanValue(data.hora) || '00:00:00',
            localizacion: cleanValue(data.localizacion) || 'Desconocido',
            numero: cleanValue(data.numero),
            cod_distrito: cleanValue(data.cod_distrito),
            distrito: cleanValue(data.distrito) || 'Desconocido',
            tipo_accidente: cleanValue(data.tipo_accidente) || 'Otro',
            estado_meteorologico: cleanValue(data['estado_meteorológico']),
            tipo_vehiculo: cleanValue(data.tipo_vehiculo),
            tipo_persona: cleanValue(data.tipo_persona),
            rango_edad: cleanValue(data.rango_edad),
            sexo: cleanValue(data.sexo),
            cod_lesividad: cleanValue(data.cod_lesividad),
            lesividad: cleanValue(data.lesividad),
            positiva_alcohol: cleanValue(data.positiva_alcohol),
            positiva_droga: cleanValue(data.positiva_droga),
            coordenadas: {
              type: 'Point',
              coordinates: coordinates
            }
          });
        } catch (error) {
          console.error('Error procesando accidente línea', lineCount, ':', error.message);
        }
      })
      .on('end', async () => {
        try {
          console.log(`   Procesadas ${lineCount} líneas, ${results.length} accidentes válidos`);
          await Accidente.deleteMany({});
          if (results.length > 0) {
            await Accidente.insertMany(results);
            console.log(`✅ ${results.length} accidentes cargados`);
          } else {
            console.log('⚠️  No se encontraron accidentes válidos');
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });
}

// Cargar puntos de medida
async function cargarPuntosMedida() {
  console.log('📍 Cargando puntos de medida...');
  const results = [];
  const dataPath = path.join(__dirname, '../../Datasets/Anthem_CTC_PuntoMedidaTrafico.csv');
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(dataPath)
      .pipe(csv({ separator: ';' }))
      .on('data', (data) => {
        try {
          const lng = parseFloat(data.longitud);
          const lat = parseFloat(data.latitud);
          
          if (!isNaN(lng) && !isNaN(lat)) {
            results.push({
              id: parseInt(data.id),
              cod_cent: data.cod_cent,
              nombre: data.nombre,
              tipo_elem: data.tipo_elem,
              distrito: data.distrito,
              coordenadas: {
                type: 'Point',
                coordinates: [lng, lat]
              }
            });
          }
        } catch (error) {
          console.error('Error procesando punto de medida:', error);
        }
      })
      .on('end', async () => {
        try {
          await PuntoMedida.deleteMany({});
          if (results.length > 0) {
            await PuntoMedida.insertMany(results);
            console.log(`✅ ${results.length} puntos de medida cargados`);
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });
}

// Cargar datos de tráfico (solo enero como ejemplo - puedes añadir más meses)
async function cargarTrafico() {
  console.log('🚗 Cargando datos de tráfico (enero 2051)...');
  const results = [];
  const dataPath = path.join(__dirname, '../../Datasets/Trafico/Anthem_CTC_Traffic_012051.csv');
  
  return new Promise((resolve, reject) => {
    let count = 0;
    const MAX_RECORDS = 50000; // Limitamos para no saturar en la primera carga
    
    fs.createReadStream(dataPath)
      .pipe(csv({ separator: ';' }))
      .on('data', (data) => {
        if (count++ >= MAX_RECORDS) return;
        
        try {
          results.push({
            id: parseInt(data.id),
            fecha: new Date(data.fecha),
            tipo_elem: data.tipo_elem,
            intensidad: parseInt(data.intensidad) || 0,
            ocupacion: parseInt(data.ocupacion) || 0,
            carga: parseInt(data.carga) || 0,
            vmed: parseInt(data.vmed) || 0,
            error: data.error,
            periodo_integracion: parseInt(data.periodo_integracion) || 0,
            coordenadas: { type: 'Point', coordinates: [0, 0] }
          });
        } catch (error) {
          console.error('Error procesando tráfico:', error);
        }
      })
      .on('end', async () => {
        try {
          await Trafico.deleteMany({});
          if (results.length > 0) {
            await Trafico.insertMany(results);
            console.log(`✅ ${results.length} registros de tráfico cargados`);
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });
}

// Vincular coordenadas de tráfico con puntos de medida
async function vincularCoordenadasTrafico() {
  console.log('🔗 Vinculando coordenadas de tráfico...');
  
  try {
    const puntosMedida = await PuntoMedida.find();
    const puntosMap = new Map();
    
    puntosMedida.forEach(punto => {
      puntosMap.set(punto.id, punto.coordenadas.coordinates);
    });
    
    const datosTrafico = await Trafico.find();
    let actualizados = 0;
    
    for (const dato of datosTrafico) {
      const coords = puntosMap.get(dato.id);
      if (coords) {
        dato.coordenadas.coordinates = coords;
        await dato.save();
        actualizados++;
      }
    }
    
    console.log(`✅ ${actualizados} registros de tráfico vinculados con coordenadas`);
  } catch (error) {
    console.error('Error vinculando coordenadas:', error);
  }
}

// Ejecutar carga
async function main() {
  try {
    console.log('🚀 Iniciando carga de datos...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');
    
    await cargarPuntosMedida();
    await cargarAccidentes();
    await cargarTrafico();
    await vincularCoordenadasTrafico();
    
    console.log('\n🎉 ¡Todos los datos cargados exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
