const mongoose = require('mongoose');

const accidenteSchema = new mongoose.Schema({
  num_expediente: { type: String, required: true, index: true },
  fecha: { type: Date, required: true, index: true },
  hora: { type: String, required: true },
  localizacion: { type: String, required: true },
  numero: String,
  cod_distrito: String,
  distrito: { type: String, required: true, index: true },
  tipo_accidente: { type: String, required: true },
  estado_meteorologico: String,
  tipo_vehiculo: String,
  tipo_persona: String,
  rango_edad: String,
  sexo: String,
  cod_lesividad: String,
  lesividad: String,
  positiva_alcohol: String,
  positiva_droga: String,
  coordenadas: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitud, latitud]
  }
}, {
  timestamps: true
});

// Índice geoespacial
accidenteSchema.index({ coordenadas: '2dsphere' });

module.exports = mongoose.model('Accidente', accidenteSchema);
