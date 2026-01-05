const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Usuario = require('../models/Usuario');
const { verificarToken, generarToken } = require('../middleware/auth');

// POST /api/auth/registro - Registro de nuevos usuarios
router.post('/registro', [
  body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
  body('email').isEmail().withMessage('Email no válido'),
  body('password').isLength({ min: 6 }).withMessage('Password debe tener mínimo 6 caracteres'),
  body('rol').optional().isIn(['ciudadano', 'gestor', 'admin'])
], async (req, res) => {
  try {
    // Validar datos
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nombre, email, password, rol, distrito } = req.body;

    // Verificar si el usuario ya existe
    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Crear nuevo usuario
    const usuario = new Usuario({
      nombre,
      email,
      password,
      rol: rol || 'ciudadano',
      distrito
    });

    await usuario.save();

    // Generar token
    const token = generarToken(usuario);

    res.status(201).json({
      mensaje: 'Usuario registrado exitosamente',
      token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        distrito: usuario.distrito
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// POST /api/auth/login - Login
router.post('/login', [
  body('email').isEmail().withMessage('Email no válido'),
  body('password').notEmpty().withMessage('Password obligatorio')
], async (req, res) => {
  try {
    // Validar datos
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Buscar usuario (necesitamos incluir password para comparar)
    const usuario = await Usuario.findOne({ email }).select('+password');
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Verificar password
    const passwordValido = await usuario.comparePassword(password);
    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Verificar si está activo
    if (!usuario.activo) {
      return res.status(403).json({ error: 'Usuario desactivado. Contacta con el administrador.' });
    }

    // Generar token
    const token = generarToken(usuario);

    res.json({
      mensaje: 'Login exitoso',
      token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        distrito: usuario.distrito
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// GET /api/auth/perfil - Obtener perfil del usuario autenticado
router.get('/perfil', verificarToken, async (req, res) => {
  try {
    res.json({
      usuario: {
        id: req.usuario._id,
        nombre: req.usuario.nombre,
        email: req.usuario.email,
        rol: req.usuario.rol,
        distrito: req.usuario.distrito,
        createdAt: req.usuario.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// PUT /api/auth/perfil - Actualizar perfil
router.put('/perfil', verificarToken, [
  body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('distrito').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nombre, distrito } = req.body;
    
    if (nombre) req.usuario.nombre = nombre;
    if (distrito !== undefined && req.usuario.rol === 'gestor') {
      req.usuario.distrito = distrito;
    }
    
    await req.usuario.save();
    
    res.json({
      mensaje: 'Perfil actualizado exitosamente',
      usuario: {
        id: req.usuario._id,
        nombre: req.usuario.nombre,
        email: req.usuario.email,
        rol: req.usuario.rol,
        distrito: req.usuario.distrito
      }
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

// GET /api/auth/verificar - Verificar si el token es válido
router.get('/verificar', verificarToken, (req, res) => {
  res.json({ 
    valido: true,
    usuario: {
      id: req.usuario._id,
      nombre: req.usuario.nombre,
      email: req.usuario.email,
      rol: req.usuario.rol
    }
  });
});

module.exports = router;
