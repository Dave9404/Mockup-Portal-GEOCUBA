require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const timeout = require('connect-timeout');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

// Configure PostgreSQL connection pool
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

// Middleware setup
app.use(cors()); // Allow CORS requests
app.use(helmet()); // Security headers
app.use(express.json({ limit: '1kb' })); // Secure payload size
app.use(express.urlencoded({ extended: true, limit: '1kb' }));

// Apply Rate Limiting only to API routes
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Max 100 requests per minute per IP
    message: 'Too many requests, please try again later.',
});
app.use('/api/', limiter);

// Apply Timeout Middleware (After Essentials)
app.use(timeout('10s'));

// Handle Timeout Errors
app.use((req, res, next) => {
    if (!req.timedout) next();
    else res.status(408).json({ error: 'Request timed out. Please try again.' });
});

// API Endpoints

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

// Start the server
const server = app.listen(port, () => {
    console.log(`Middleware API running at http://localhost:${port}`);
});

// Close slow connections and prevent too many concurrent connections
server.headersTimeout = 11000; // Force close after 11s (1s after timeout middleware)
server.requestTimeout = 10000; // Close connections that take too long to send data

// Limit active connections per IP
const net = require('net');
const activeConnections = new Map();

server.on('connection', (socket) => {
    const ip = socket.remoteAddress;
    activeConnections.set(ip, (activeConnections.get(ip) || 0) + 1);

    // Limit each IP to 10 concurrent connections
    if (activeConnections.get(ip) > 10) {
        socket.destroy();
    }

    socket.on('close', () => {
        activeConnections.set(ip, activeConnections.get(ip) - 1);
        if (activeConnections.get(ip) === 0) {
            activeConnections.delete(ip);
        }
    });
});
