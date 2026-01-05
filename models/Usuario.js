const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const usuarioSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Email no válido']
  },
  password: {
    type: String,
    required: [true, 'El password es obligatorio'],
    minlength: [6, 'El password debe tener al menos 6 caracteres']
  },
  rol: {
    type: String,
    enum: ['ciudadano', 'gestor', 'admin'],
    default: 'ciudadano'
  },
  distrito: {
    type: String,
    default: null
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Encriptar password antes de guardar
usuarioSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Método para comparar passwords
usuarioSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// No devolver el password en las respuestas JSON
usuarioSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('Usuario', usuarioSchema);
