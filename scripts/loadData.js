const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
require('dotenv').config();

const Accidente = require('../models/Accidente');
const PuntoMedida = require('../models/PuntoMedida');
const Trafico = require('../models/Trafico');

// Función para convertir coordenadas UTM a lat/lng (zona UTM 30N - ETRS89/WGS84)
function utmToLatLng(easting, northing) {
  // Zona 30N: Meridiano central -3° (longitud 3°W)
  // Para Madrid: X ≈ 440000, Y ≈ 4474000
  
  const a = 6378137.0; // Semi-eje mayor WGS84 (metros)
  const e = 0.0818191908426; // Primera excentricidad
  const e2 = e * e;
  const k0 = 0.9996; // Factor de escala UTM
  
  // Eliminar falso este (500km)
  const x = easting - 500000.0;
  const y = northing;
  
  // Meridiano central de la zona 30N
  const lon0 = -3.0 * Math.PI / 180.0;
  
  // Cálculo del footpoint latitude
  const M = y / k0;
  const mu = M / (a * (1 - e2/4 - 3*e2*e2/64 - 5*e2*e2*e2/256));
  
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  
  const J1 = (3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32);
  const J2 = (21 * Math.pow(e1, 2) / 16 - 55 * Math.pow(e1, 4) / 32);
  const J3 = (151 * Math.pow(e1, 3) / 96);
  const J4 = (1097 * Math.pow(e1, 4) / 512);
  
  const fp = mu + J1 * Math.sin(2*mu) + J2 * Math.sin(4*mu) + J3 * Math.sin(6*mu) + J4 * Math.sin(8*mu);
  
  // Calcular términos
  const C1 = e2 * Math.pow(Math.cos(fp), 2);
  const T1 = Math.pow(Math.tan(fp), 2);
  const R1 = a * (1 - e2) / Math.pow(1 - e2 * Math.pow(Math.sin(fp), 2), 1.5);
  const N1 = a / Math.sqrt(1 - e2 * Math.pow(Math.sin(fp), 2));
  const D = x / (N1 * k0);
  
  // Calcular latitud
  const Q1 = N1 * Math.tan(fp) / R1;
  const Q2 = Math.pow(D, 2) / 2;
  const Q3 = (5 + 3*T1 + 10*C1 - 4*Math.pow(C1, 2) - 9*e2) * Math.pow(D, 4) / 24;
  const Q4 = (61 + 90*T1 + 298*C1 + 45*Math.pow(T1, 2) - 3*Math.pow(C1, 2) - 252*e2) * Math.pow(D, 6) / 720;
  
  const lat = fp - Q1 * (Q2 - Q3 + Q4);
  
  // Calcular longitud
  const Q5 = D;
  const Q6 = (1 + 2*T1 + C1) * Math.pow(D, 3) / 6;
  const Q7 = (5 - 2*C1 + 28*T1 - 3*Math.pow(C1, 2) + 8*e2 + 24*Math.pow(T1, 2)) * Math.pow(D, 5) / 120;
  
  const lon = lon0 + (Q5 - Q6 + Q7) / Math.cos(fp);
  
  // Convertir a grados
  const latDeg = lat * 180.0 / Math.PI;
  const lonDeg = lon * 180.0 / Math.PI;
  
  // Retornar [longitud, latitud] para GeoJSON
  return [lonDeg, latDeg];
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
