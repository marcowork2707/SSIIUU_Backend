# ANTHEM SafeMove - Backend API

Backend para el sistema de seguridad vial y movilidad inteligente de Anthem.

## 🚀 Tecnologías

- Node.js + Express
- MongoDB + Mongoose
- CSV Parser para carga de datos

## 📦 Instalación

```bash
npm install
```

## ⚙️ Configuración

Crea un archivo `.env` con:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/anthem_safemove
NODE_ENV=development
```

## 🗄️ Carga de datos

Antes de iniciar el servidor, carga los datos desde los CSVs:

```bash
npm run load-data
```

Esto cargará:
- Accidentes (Anthem_CTC_Accidentalidad.csv)
- Puntos de medida de tráfico (Anthem_CTC_PuntoMedidaTrafico.csv)
- Datos de tráfico enero 2051 (Anthem_CTC_Traffic_012051.csv)

## 🏃 Ejecución

```bash
# Desarrollo (con nodemon)
npm run dev

# Producción
npm start
```

El servidor estará disponible en: http://localhost:5000

## 📡 Endpoints API

### Accidentes
- `GET /api/accidentes` - Listar accidentes (con filtros: distrito, desde, hasta, tipo)
- `GET /api/accidentes/distrito/:distrito` - Accidentes por distrito
- `GET /api/accidentes/cerca?lng=X&lat=Y&radio=1000` - Accidentes cercanos
- `GET /api/accidentes/heatmap` - Datos para mapa de calor

### Tráfico
- `GET /api/trafico` - Datos de tráfico (filtros: id, desde, hasta)
- `GET /api/trafico/promedio` - Promedios por punto de medida

### Puntos de Medida
- `GET /api/puntos-medida` - Todos los puntos
- `GET /api/puntos-medida/:id` - Punto específico

### KPIs
- `GET /api/kpis/general` - KPIs generales (total, por distrito, tipo, hora, vehículo)
- `GET /api/kpis/riesgo` - Scoring de riesgo por zona y hora
- `GET /api/kpis/demografia` - Distribución por edad y sexo
- `GET /api/kpis/meteorologia` - Estadísticas por condiciones meteorológicas

## 📊 Modelos de datos

### Accidente
- Información completa del accidente
- Coordenadas geoespaciales
- Índices en fecha, distrito, expediente

### Trafico
- Datos de intensidad, ocupación, carga
- Vinculado a puntos de medida
- Índices en fecha e id

### PuntoMedida
- Ubicaciones de sensores de tráfico
- Coordenadas precisas
- Índice geoespacial

## 👨‍💻 Autor

Marco Muñoz García - Sistemas de Información Ubicuos (UCLM)
