# Portal GEOCUBA

## Descripción
Portal web oficial de GEOCUBA, desarrollado con Node.js y Express. El sitio ofrece información institucional, noticias, eventos, servicios y detalles sobre las empresas del grupo GEOCUBA.

## Requisitos previos
- Node.js (v16 o superior)
- NPM (v8 o superior)
- PostgreSQL (v14 o superior)

## Estructura del proyecto
- `server.js` - Servidor principal Express
- `assets/` - Recursos estáticos (CSS, JS, imágenes)
- `js/` - Scripts del cliente
- `.env` - Archivo de configuración de variables de entorno

## Instalación

### 1. Clonar el repositorio
```bash
git clone <repositorio>
cd Mockup-Portal-GEOCUBA
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar la base de datos
El portal requiere una base de datos PostgreSQL. Asegúrese de crear la base de datos y configurar las credenciales en el archivo `.env`.

### 4. Configurar archivo .env
Cree o edite el archivo `.env` en el directorio raíz con la siguiente información:

```
# Configuración del servidor
PORT=8080
NODE_ENV=development

# Configuración de base de datos
DB_HOST=localhost
DB_USER=usuario_db
DB_PASSWORD=contraseña_db
DB_NAME=geocuba_portal
DB_PORT=5432

# Otros parámetros (opcional)
SERVER=localhost
```

## Ejecución

### Modo desarrollo
```bash
npm start
```
Esto iniciará el servidor en http://localhost:8080 (o el puerto definido en .env)

### Modo producción
```bash
npm run start:production
```
Esto ejecutará el servidor con las optimizaciones para entorno de producción.

### Modo HTTPS (requiere certificados SSL)
```bash
npm run start:https
```
Para ejecutar el servidor con soporte HTTPS. Requiere certificados SSL configurados.

## Seguridad
El servidor implementa múltiples capas de seguridad:
- Limitación de tasa de peticiones (rate limiting)
- Monitoreo de carga del servidor
- Limitación de conexiones por IP
- Control de acceso basado en whitelist
- Headers de seguridad (X-Frame-Options, Content-Security-Policy)

## API Endpoints
El portal ofrece los siguientes endpoints API:

- `/api/config` - Proporciona información de configuración al frontend
- `/api/get-presentacion` - Datos de presentación institucional
- `/api/get-noticias-destacadas` - Noticias destacadas
- `/api/get-services` - Servicios ofrecidos
- `/api/get-preguntas-frecuentes` - Preguntas frecuentes
- `/api/get-empresas` - Lista de empresas del grupo
- `/api/get-eventos` - Eventos institucionales
- `/api/get-noticias` - Noticias generales

## Mantenimiento
Para realizar actualizaciones o modificaciones:

1. Edite el código fuente según sea necesario
2. Pruebe los cambios localmente
3. Despliegue en el servidor destino

## Observaciones
- Utilice únicamente el puerto 8080 para acceder al sitio en el servidor de producción
- Las rutas sensibles como `/package.json` y `/server.js` están bloqueadas por seguridad
- El sitio está optimizado para funcionar principalmente en navegadores modernos

## Soporte
Para cualquier consulta técnica, contacte al equipo de desarrollo de GEOCUBA.
