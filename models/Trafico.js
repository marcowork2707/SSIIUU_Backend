const mongoose = require('mongoose');

const traficoSchema = new mongoose.Schema({
  id: { type: Number, required: true, index: true },
  fecha: { type: Date, required: true, index: true },
  tipo_elem: String,
  intensidad: Number,
  ocupacion: Number,
  carga: Number,
  vmed: Number,
  error: String,
  periodo_integracion: Number,
  coordenadas: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  }
}, {
  timestamps: true
});

traficoSchema.index({ coordenadas: '2dsphere' });

module.exports = mongoose.model('Trafico', traficoSchema);
