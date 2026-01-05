const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

// Secret key (debe estar en .env en producción)
const JWT_SECRET = process.env.JWT_SECRET || 'anthem_safemove_secret_key_2051';

// Verificar token JWT
exports.verificarToken = async (req, res, next) => {
  try {
    // Obtener token del header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Acceso denegado. Se requiere autenticación.' });
    }

    // Verificar token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Buscar usuario
    const usuario = await Usuario.findById(decoded.id);
    
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Usuario no válido o desactivado' });
    }

    // Agregar usuario a la request
    req.usuario = usuario;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token no válido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    res.status(500).json({ error: 'Error en la autenticación' });
  }
};

// Verificar roles específicos
exports.verificarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ 
        error: 'No tienes permisos para acceder a este recurso',
        rolRequerido: rolesPermitidos,
        tuRol: req.usuario.rol
      });
    }

    next();
  };
};

// Generar JWT
exports.generarToken = (usuario) => {
  return jwt.sign(
    { 
      id: usuario._id, 
      email: usuario.email,
      rol: usuario.rol 
    },
    JWT_SECRET,
    { expiresIn: '7d' } // Token válido por 7 días
  );
};
