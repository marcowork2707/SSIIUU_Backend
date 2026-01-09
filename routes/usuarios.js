const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const { verificarToken, verificarRol } = require('../middleware/auth');

// GET todos los usuarios (solo admin)
router.get('/', verificarToken, verificarRol('admin'), async (req, res) => {
  try {
    const usuarios = await Usuario.find().select('-password');
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST crear nuevo usuario (solo admin)
router.post('/', verificarToken, verificarRol('admin'), async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    // Validar que el email no exista
    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Crear usuario
    const nuevoUsuario = new Usuario({
      nombre,
      email,
      password, // Se hasheará automáticamente con el pre-save hook
      rol
    });

    await nuevoUsuario.save();

    // Devolver sin password
    const usuarioRespuesta = nuevoUsuario.toObject();
    delete usuarioRespuesta.password;

    res.status(201).json(usuarioRespuesta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT actualizar usuario (solo admin)
router.put('/:id', verificarToken, verificarRol('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, rol, password } = req.body;

    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Actualizar campos
    if (nombre) usuario.nombre = nombre;
    if (email) usuario.email = email;
    if (rol) usuario.rol = rol;
    if (password) usuario.password = password; // Se hasheará con el pre-save hook

    await usuario.save();

    const usuarioRespuesta = usuario.toObject();
    delete usuarioRespuesta.password;

    res.json(usuarioRespuesta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE eliminar usuario (solo admin)
router.delete('/:id', verificarToken, verificarRol('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.findByIdAndDelete(id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ mensaje: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
