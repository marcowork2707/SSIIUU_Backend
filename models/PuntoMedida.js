const mongoose = require('mongoose');

const puntoMedidaSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  cod_cent: String,
  nombre: String,
  tipo_elem: String,
  distrito: String,
  coordenadas: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitud, latitud]
  }
}, {
  timestamps: true
});

puntoMedidaSchema.index({ coordenadas: '2dsphere' });

module.exports = mongoose.model('PuntoMedida', puntoMedidaSchema);
