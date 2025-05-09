// Simple server for local development that works with both IP and localhost
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const path = require('path');
const { Pool } = require('pg');
const cors = require('cors');

// Create Express app
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
// Use only minimal security for development
app.use(helmet({ 
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.disable('x-powered-by'); 
app.use(cors()); 

// Handle request limits
app.use(express.json({ limit: '1kb' }));
app.use(express.urlencoded({ extended: true, limit: '1kb' }));

// ================= IP ADDRESS HANDLING =================
// Add middleware to detect if a client is using an IP address
app.use((req, res, next) => {
    // Only do this for the initial HTML page request, not for assets
    if (req.path === '/' || req.path.endsWith('.html')) {
        // If connecting via IP and not localhost
        const host = req.hostname;
        if (host !== 'localhost' && /^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
            console.log(`Detected access via IP address: ${host}`);
            
            // Special handling for IP access - modify response
            res.locals.usingIpAddress = true;
        }
    }
    next();
});

// ================= INJECT CONFIGURATION =================
// Inject environment variables into HTML files
app.use((req, res, next) => {
    // If the request is for an HTML file
    if (req.path === '/' || req.path.endsWith('.html')) {
        // Save the original send function
        const originalSend = res.send;
        
        // Override the send function
        res.send = function(body) {
            // Only modify HTML responses
            if (typeof body === 'string' && body.includes('<!DOCTYPE html>')) {
                // Add special script at the top of head to handle IP-based access
                if (res.locals.usingIpAddress) {
                    const ipHandlerScript = `
                    <script>
                        // Special script to handle asset loading for IP-based access
                        document.addEventListener('DOMContentLoaded', function() {
                            // Fix all link tags (CSS)
                            document.querySelectorAll('link[rel="stylesheet"]').forEach(function(link) {
                                if (link.href && link.href.includes('https://')) {
                                    link.href = link.href.replace('https://', 'http://');
                                }
                            });
                            
                            // Fix all script tags
                            document.querySelectorAll('script[src]').forEach(function(script) {
                                if (script.src && script.src.includes('https://')) {
                                    script.src = script.src.replace('https://', 'http://');
                                }
                            });
                            
                            // Fix all images
                            document.querySelectorAll('img[src]').forEach(function(img) {
                                if (img.src && img.src.includes('https://')) {
                                    img.src = img.src.replace('https://', 'http://');
                                }
                            });
                        });
                    </script>`;
                    
                    // Insert at the beginning of the head section
                    body = body.replace('<head>', '<head>' + ipHandlerScript);
                }
                
                // Inject standard configuration
                const configScript = `
                <script>
                    // Server-injected configuration 
                    window.SERVER_CONFIG = {
                        server: "${process.env.SERVER || 'localhost'}",
                        port: "${process.env.PORT || '8060'}",
                        apiUrl: "http://${req.headers.host}/api"
                    };
                </script>`;
                
                // Insert the script right before the closing </head> tag
                body = body.replace('</head>', configScript + '</head>');
            }
            
            // Call the original send with the modified body
            return originalSend.call(this, body);
        };
    }
    
    next();
});

// ================= STATIC FILES SERVING =================
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use(express.static(__dirname)); // Serve all HTML files from root directory

// ================= API ENDPOINTS =================
// Configuration endpoint - provides server address to frontend
app.get('/api/config', (req, res) => {
    res.json({
        server: process.env.SERVER || 'localhost',
        port: process.env.PORT || 8060,
        apiUrl: `http://${req.headers.host}/api`
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

// Get eventos data
app.get('/api/get-eventos', async (req, res) => {
    try {
        const query = `
            SELECT id, titulo, 
                   TO_CHAR(fechai, 'DD/MM/YYYY') as fechai,
                   TO_CHAR(fechaf, 'DD/MM/YYYY') as fechaf,
                   descripcion, img 
            FROM sitio.eventos
            ORDER BY fechai DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching eventos:', error);
        res.status(500).json({ error: 'Database error.' });
    }
});

// ================= SERVER START =================
const PORT = process.env.PORT || 8060;
// Listen on all network interfaces (0.0.0.0) instead of just localhost
const server = app.listen(PORT, '0.0.0.0', () => {
    const interfaces = require('os').networkInterfaces();
    const addresses = [];
    
    // Get all IP addresses of this machine
    Object.keys(interfaces).forEach((interfaceName) => {
        interfaces[interfaceName].forEach((iface) => {
            // Skip internal/non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push(iface.address);
            }
        });
    });
    
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Access from other devices using:');
    addresses.forEach(addr => {
        console.log(`http://${addr}:${PORT}`);
    });
});
