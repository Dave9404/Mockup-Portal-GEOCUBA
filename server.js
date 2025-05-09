require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { Pool } = require('pg');
const cors = require('cors');
const timeout = require('connect-timeout');
const requestIp = require('request-ip');
const toobusy = require('toobusy-js');

const app = express();

// Configure PostgreSQL connection pool
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

// ================= SECURITY MIDDLEWARE =================
// No security middleware to prevent HTTPS upgrading
app.disable('x-powered-by'); 
app.use(cors()); // Allow CORS requests

// Add security headers
app.use((req, res, next) => {
    // Add X-Frame-Options to prevent clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    // Add Content-Security-Policy header with Google Fonts and Maps allowed
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; frame-src https://*.google.com https://www.google.com");
    next();
});

// Whitelist-based security middleware
app.use((req, res, next) => {
    const path = req.path;
    
    // Define whitelist patterns
    const allowedPatterns = [
        // HTML pages
        /^\/$/, // Root path
        /^\/index\.html$/,
        /^\/noticias\.html$/,
        /^\/eventos\.html$/,
        /^\/servicios\.html$/,
        /^\/empresas\.html$/,
        
        // API endpoints
        /^\/api\/.+$/,
        
        // Allowed asset directories
        /^\/assets\/.+\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/,
        /^\/js\/.+\.js$/,
        /^\/css\/.+\.css$/,
        
        // Favicon
        /^\/favicon\.ico$/
    ];
    
    // Check if the request path matches any allowed pattern
    const isAllowed = allowedPatterns.some(pattern => pattern.test(path));
    
    if (isAllowed) {
        next(); // Allow the request
    } else {
        // Block access to any path not explicitly allowed
        return res.status(403).send('Access Forbidden');
    }
});

// Configure toobusy for server load monitoring
toobusy.maxLag(100); // Set maximum lag to 100ms (increased from 50ms to be less aggressive)
app.use((req, res, next) => {
    if (toobusy()) {
        res.status(503).json({ error: 'Server is too busy. Please try again later.' });
    } else {
        next();
    }
});

// Request body size limits
app.use(express.json({ limit: '1kb' })); // Secure payload size
app.use(express.urlencoded({ extended: true, limit: '1kb' }));

// Rate limiting for ALL routes (prevents DDoS)
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 500, // Limit each IP to 500 requests per minute (increased from 200)
    standardHeaders: true,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter); // Apply rate limiting to API routes

// Timeout middleware to prevent slow DoS attacks
app.use(timeout('10s')); // 10 second timeout (increased from 5s)
app.use((req, res, next) => {
    if (!req.timedout) next();
    else res.status(408).json({ error: 'Request timed out. Please try again.' });
});

// ================= STATIC FILES SERVING =================
// Add middleware to process HTML files before serving them
// This will replace template variables with actual values from .env
app.use((req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(body) {
    // Only modify string responses that are likely HTML
    if (typeof body === 'string' && body.includes('<!DOCTYPE html>')) {
      // Get SERVER and PORT from environment variables
      const server = process.env.SERVER || 'localhost';
      const port = process.env.PORT || '8060';
      
      // Replace all instances of {{SERVER}} and {{PORT}} globally in the HTML
      body = body.replace(/\{\{SERVER\}\}/g, server);
      body = body.replace(/\{\{PORT\}\}/g, port);
    }
    
    // Call the original send with the modified body
    return originalSend.call(this, body);
  };
  
  next();
});

// Mount directories for static files
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use(express.static(__dirname)); // Serve all HTML files from root directory

// ================= API ENDPOINTS =================

// Configuration endpoint - provides server address to frontend
app.get('/api/config', (req, res) => {
    // Use the actual host from the request
    const host = req.headers.host;
    res.json({
        server: req.hostname,
        port: host.includes(':') ? host.split(':')[1] : process.env.PORT || '8060',
        apiUrl: `http://${host}/api`
    });
});

// Get presentation data
app.get('/api/get-presentacion', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, titulo, qsomos, objetivo, qhacemos, clogramos, descripcion, imagen, img 
            FROM sitio.presentacion
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching presentation data:', error);
        res.status(500).json({ error: 'Database error.' });
    }
});

// Get highlighted news
app.get('/api/get-noticias-destacadas', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, titulo, noticia, imagen, link 
            FROM sitio.noticias 
            WHERE destacar = true
            ORDER BY id DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching noticias destacadas:', error);
        res.status(500).json({ error: 'Database error.' });
    }
});

// Get services data
app.get('/api/get-services', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, nombre, descripcion, img, link 
            FROM sitio.productos_servicios 
            ORDER BY id ASC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({ error: 'Database error.' });
    }
});

// Get FAQ (Preguntas Frecuentes)
app.get('/api/get-preguntas-frecuentes', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, pregunta, respuesta, fecha 
            FROM sitio.preguntas 
            ORDER BY id ASC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching preguntas frecuentes:', error);
        res.status(500).json({ error: 'Database error.' });
    }
});

// Get empresas data
app.get('/api/get-empresas', async (req, res) => {
    try {
        const result = await pool.query('SELECT empresa FROM sitio.empresas ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching empresas:', error);
        res.status(500).json({ error: 'Database error.' });
    }
});

// Get all companies with details
app.get('/api/get-empresas-details', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, empresa, descripcion, direccion, telf, mail, sitio, logo, especializada 
            FROM sitio.empresas
            ORDER BY especializada DESC, empresa ASC
        `);
        
        // Transform binary logo data to base64 for frontend use
        const companies = result.rows.map(company => ({
            ...company,
            logo: company.logo ? company.logo.toString('base64') : null
        }));

        res.json(companies);
    } catch (error) {
        console.error('Error fetching company details:', error);
        res.status(500).json({ error: 'Database error.' });
    }
});

// Get service details and its product lines
app.get('/api/get-service/:nombre', async (req, res) => {
    try {
        const { nombre } = req.params;
        
        const serviceResult = await pool.query(`
            SELECT id, nombre, descripcion, contacto, img, img2
            FROM sitio.productos_servicios 
            WHERE nombre = $1
        `, [nombre]);
        
        if (serviceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }
        
        const service = serviceResult.rows[0];
        
        const productLinesResult = await pool.query(`
            SELECT id, titulo, descripcion, img 
            FROM sitio.lineaprod 
            WHERE servicioid = $1
            ORDER BY id ASC
        `, [service.id]);
        
        res.json({
            service: service,
            productLines: productLinesResult.rows
        });
    } catch (error) {
        console.error('Error fetching service data:', error);
        res.status(500).json({ error: 'Database error.' });
    }
});

// Get events data
app.get('/api/get-eventos', async (req, res) => {
    try {
        const query = `
            SELECT id, titulo, 
                   TO_CHAR(fechai, 'DD/MM/YYYY') as fechai,
                   TO_CHAR(fechaf, 'DD/MM/YYYY') as fechaf,
                   descripcion, link, descarga, lugar, 
                   encode(imagen, 'base64') as imagen
            FROM sitio.eventos
            ORDER BY fechai DESC;
        `;
        
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener eventos:', error);
        res.status(500).json({ error: 'Error al obtener los eventos' });
    }
});

// Get latest news
app.get('/api/get-noticias', async (req, res) => {
    try {
        const query = `
            SELECT id, titulo, noticia, link, destacar, 
                   encode(imagen, 'base64') as imagen,
                   TO_CHAR(fecha, 'DD/MM/YYYY') as fecha 
            FROM sitio.noticias 
            ORDER BY fecha DESC 
            LIMIT 3;
        `;
        
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener noticias:', error);
        res.status(500).json({ error: 'Error al obtener las noticias' });
    }
});

// Get specific news by ID
app.get('/api/get-noticia/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT id, titulo, noticia, link, destacar, 
                   encode(imagen, 'base64') as imagen,
                   TO_CHAR(fecha, 'DD/MM/YYYY') as fecha 
            FROM sitio.noticias 
            WHERE id = $1;
        `;
        
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Noticia no encontrada' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener la noticia:', error);
        res.status(500).json({ error: 'Error al obtener la noticia' });
    }
});

// Query endpoint
app.post('/api/query', async (req, res) => {
    const { query } = req.body;

    // Basic validation to prevent dangerous queries
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return res.status(400).json({ error: 'Invalid query.' });
    }

    try {
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ error: 'Database error.' });
    }
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error.' });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 8060;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access at:`);
    console.log(`- http://localhost:${PORT}`);
    
    // Display IP addresses
    const interfaces = require('os').networkInterfaces();
    Object.keys(interfaces).forEach((interfaceName) => {
        interfaces[interfaceName].forEach((iface) => {
            if (iface.family === 'IPv4' && !iface.internal) {
                console.log(`- http://${iface.address}:${PORT}`);
            }
        });
    });
});

// ================= CONNECTION MANAGEMENT =================
// Close slow connections and prevent too many concurrent connections
server.headersTimeout = 15000; // Force close after 15s (increased from 6s)
server.requestTimeout = 10000; // Close connections that take too long to send data (increased from 5s)

// Limit active connections per IP
const activeConnections = new Map();
const requestQueue = new Map();
const MAX_CONNECTIONS_PER_IP = 50; // Increased from 20
const MAX_QUEUE_SIZE = 400; // Increased from 200

server.on('connection', (socket) => {
    const ip = socket.remoteAddress || '0.0.0.0';
    
    // Track connections by IP
    activeConnections.set(ip, (activeConnections.get(ip) || 0) + 1);
    
    // Add to request queue
    if (!requestQueue.has(ip)) {
        requestQueue.set(ip, []);
    }
    
    const queue = requestQueue.get(ip);
    queue.push(Date.now());
    
    // Limit each IP to MAX_CONNECTIONS_PER_IP concurrent connections
    if (activeConnections.get(ip) > MAX_CONNECTIONS_PER_IP || queue.length > MAX_QUEUE_SIZE) {
        socket.destroy();
    }
    
    // Cleanup old requests from queue (older than 1 minute)
    const now = Date.now();
    while (queue.length > 0 && queue[0] < now - 60000) {
        queue.shift();
    }
    
    socket.on('close', () => {
        // Update connection count
        const count = activeConnections.get(ip);
        if (count <= 1) {
            activeConnections.delete(ip);
        } else {
            activeConnections.set(ip, count - 1);
        }
    });
});

// Clean shutdown handling
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

function shutdown() {
    console.log('Shutting down server gracefully...');
    toobusy.shutdown();
    server.close(() => {
        console.log('Server closed');
        pool.end(() => {
            console.log('Database pool closed');
            process.exit(0);
        });
    });
}