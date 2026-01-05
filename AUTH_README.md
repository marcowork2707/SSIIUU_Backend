# 🚦 ANTHEM SafeMove - Sistema de Autenticación JWT

## ✅ **Sistema de Autenticación Implementado**

### **Características:**
- ✅ Autenticación JWT con tokens de 7 días
- ✅ 3 roles de usuario: Ciudadano, Gestor, Admin
- ✅ Middleware de protección de rutas por rol
- ✅ Encriptación de contraseñas con bcrypt
- ✅ Rutas públicas y privadas en frontend
- ✅ Context API para gestión global de estado
- ✅ Persistencia de sesión en localStorage

---

## 👥 **Roles y Permisos**

### **👤 Ciudadano**
**Acceso:**
- ✅ Mapa de accidentes
- ✅ KPIs generales públicos
- ❌ Análisis avanzados
- ❌ Scoring de riesgo

**Uso:** Usuario estándar que consulta información pública

---

### **👮 Gestor de Movilidad**
**Acceso:**
- ✅ Todo lo del ciudadano
- ✅ Análisis avanzados (gráficas detalladas)
- ✅ Scoring de riesgo por zona
- ✅ Comparador de rutas
- ❌ Gestión de usuarios

**Uso:** Personal de movilidad urbana que necesita datos avanzados

---

### **🔧 Administrador**
**Acceso:**
- ✅ Acceso total a todas las funcionalidades
- ✅ Gestión de usuarios
- ✅ Todas las herramientas de análisis

**Uso:** Administrador del sistema

---

## 🔐 **Credenciales de Demo**

### **Acceso Ciudadano:**
```
Email: ciudadano@anthem.com
Password: password123
```

### **Acceso Gestor:**
```
Email: gestor@anthem.com
Password: password123
```

### **Acceso Administrador:**
```
Email: admin@anthem.com
Password: password123
```

---

## 🚀 **Cómo Iniciar el Sistema**

### **1. Backend (Terminal 1):**
```bash
cd SSIIUU_Backend
npm run dev
```
✅ Servidor corriendo en: http://localhost:5000

### **2. Frontend (Terminal 2):**
```bash
cd SSIIUU_Frontend
npm run dev
```
✅ App corriendo en: http://localhost:3000

### **3. Acceder a la aplicación:**
1. Abre el navegador en http://localhost:3000
2. Serás redirigido a `/login`
3. Ingresa credenciales de demo
4. Explora según tu rol

---

## 📡 **Endpoints de Autenticación**

### **POST /api/auth/registro**
Registrar nuevo usuario
```json
{
  "nombre": "Nombre Completo",
  "email": "email@ejemplo.com",
  "password": "password123",
  "rol": "ciudadano"
}
```

### **POST /api/auth/login**
Iniciar sesión
```json
{
  "email": "ciudadano@anthem.com",
  "password": "password123"
}
```

**Respuesta:**
```json
{
  "mensaje": "Login exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": "...",
    "nombre": "Usuario Ciudadano",
    "email": "ciudadano@anthem.com",
    "rol": "ciudadano"
  }
}
```

### **GET /api/auth/perfil**
Obtener perfil del usuario autenticado
```bash
Authorization: Bearer <token>
```

### **GET /api/auth/verificar**
Verificar si el token es válido
```bash
Authorization: Bearer <token>
```

---

## 🔒 **Rutas Protegidas**

### **Backend:**

#### **Públicas (sin autenticación):**
- `GET /api/kpis/general` - KPIs generales
- `GET /api/accidentes` - Lista de accidentes
- `GET /api/accidentes/heatmap` - Datos para mapa

#### **Protegidas (requieren login):**
- `GET /api/kpis/riesgo` - Scoring de riesgo (gestor/admin)
- `GET /api/kpis/demografia` - Análisis demográfico (gestor/admin)

---

### **Frontend:**

#### **Rutas Públicas:**
- `/login` - Página de inicio de sesión
- `/registro` - Registro de nuevos usuarios

#### **Rutas Privadas (requieren login):**
- `/dashboard` - Dashboard principal (todos)
- `/analisis` - Análisis avanzado (gestor/admin)
- `/scoring` - Scoring de riesgo (gestor/admin)
- `/usuarios` - Gestión de usuarios (admin)

---

## 🧪 **Pruebas con curl**

### **1. Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gestor@anthem.com","password":"password123"}'
```

### **2. Acceder a ruta protegida:**
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/kpis/riesgo
```

### **3. Obtener perfil:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/auth/perfil
```

---

## 📦 **Dependencias Instaladas**

### **Backend:**
```json
{
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.2",
  "express-validator": "^7.2.0"
}
```

### **Frontend:**
```json
{
  "react-router-dom": "^7.1.3"
}
```

---

## 🗂️ **Estructura de Archivos Nuevos**

### **Backend:**
```
SSIIUU_Backend/
├── models/
│   └── Usuario.js              # Modelo de usuario con roles
├── middleware/
│   └── auth.js                 # Middleware de autenticación JWT
├── routes/
│   └── auth.js                 # Rutas de autenticación
└── scripts/
    └── createDemoUsers.js      # Script para crear usuarios demo
```

### **Frontend:**
```
SSIIUU_Frontend/
├── src/
│   ├── context/
│   │   └── AuthContext.jsx     # Context API para auth
│   ├── components/
│   │   ├── Login.jsx           # Página de login
│   │   ├── Login.css
│   │   ├── Register.jsx        # Página de registro
│   │   ├── Register.css
│   │   ├── Navbar.jsx          # Barra de navegación con logout
│   │   ├── Navbar.css
│   │   ├── ProtectedRoute.jsx  # Componente para proteger rutas
│   │   ├── DashboardPage.jsx   # Wrapper del dashboard
│   │   └── DashboardPage.css
│   └── App.jsx                 # Router con rutas públicas/privadas
```

---

## 🔐 **Variables de Entorno (.env)**

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/anthem_safemove
NODE_ENV=development
JWT_SECRET=anthem_safemove_super_secret_key_2051_do_not_share
```

⚠️ **IMPORTANTE:** En producción, cambia `JWT_SECRET` por una clave segura y única.

---

## 🎯 **Flujo de Autenticación**

### **1. Usuario accede a la app:**
```
http://localhost:3000
  ↓
Redirige a /login (no autenticado)
```

### **2. Usuario inicia sesión:**
```
POST /api/auth/login
  ↓
Backend valida credenciales
  ↓
Genera JWT token
  ↓
Frontend guarda token en localStorage
  ↓
Redirige a /dashboard
```

### **3. Usuario navega por la app:**
```
Frontend verifica token en cada request
  ↓
Incluye header: Authorization: Bearer <token>
  ↓
Backend verifica token y permisos
  ↓
Devuelve datos según rol
```

### **4. Usuario cierra sesión:**
```
Clic en botón "Salir"
  ↓
Frontend elimina token de localStorage
  ↓
Redirige a /login
```

---

## ✅ **Testing Completado**

- ✅ Registro de usuarios
- ✅ Login con credenciales correctas
- ✅ Rechazo de credenciales incorrectas
- ✅ Persistencia de sesión (refresh mantiene login)
- ✅ Protección de rutas por rol
- ✅ Logout y limpieza de token
- ✅ Tokens con expiración de 7 días
- ✅ Encriptación de passwords con bcrypt

---

## 🚧 **Próximos Pasos**

1. **Implementar secciones protegidas:**
   - Página de análisis avanzado
   - Página de scoring de riesgo
   - Panel de administración de usuarios

2. **Añadir funcionalidades avanzadas:**
   - Refresh tokens automáticos
   - Recuperación de contraseña por email
   - Bloqueo de cuentas tras intentos fallidos
   - Historial de accesos por usuario

3. **Seguridad adicional:**
   - Rate limiting en endpoints de auth
   - HTTPS en producción
   - Validación de email con token de confirmación

---

## 📚 **Recursos de Aprendizaje**

- **JWT.io**: https://jwt.io/ - Decodificar y entender tokens JWT
- **bcrypt**: https://github.com/kelektiv/node.bcrypt.js - Documentación de encriptación
- **React Router**: https://reactrouter.com/ - Routing en React

---

**Desarrollado para el proyecto ANTHEM SafeMove - UCLM 2026** 🎓
