const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');
require('dotenv').config({ path: __dirname + '/../.env' });

const usuariosDemo = [
  {
    nombre: 'Usuario Ciudadano',
    email: 'ciudadano@anthem.com',
    password: 'password123',
    rol: 'ciudadano'
  },
  {
    nombre: 'Gestor de Movilidad',
    email: 'gestor@anthem.com',
    password: 'password123',
    rol: 'gestor',
    distrito: 'CENTRO'
  },
  {
    nombre: 'Administrador',
    email: 'admin@anthem.com',
    password: 'password123',
    rol: 'admin'
  }
];

async function crearUsuariosDemo() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Eliminar usuarios demo existentes
    await Usuario.deleteMany({ email: { $in: usuariosDemo.map(u => u.email) } });
    console.log('🧹 Usuarios demo anteriores eliminados');

    // Crear nuevos usuarios
    for (const userData of usuariosDemo) {
      const usuario = new Usuario(userData);
      await usuario.save();
      console.log(`✅ Usuario creado: ${usuario.email} (${usuario.rol})`);
    }

    console.log('\n🎉 ¡Usuarios demo creados exitosamente!');
    console.log('\n📝 Credenciales de acceso:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 Ciudadano:');
    console.log('   Email: ciudadano@anthem.com');
    console.log('   Password: password123');
    console.log('');
    console.log('👮 Gestor de Movilidad:');
    console.log('   Email: gestor@anthem.com');
    console.log('   Password: password123');
    console.log('');
    console.log('🔧 Administrador:');
    console.log('   Email: admin@anthem.com');
    console.log('   Password: password123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

crearUsuariosDemo();
