// HTTPS Server with self-signed certificate for development
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const path = require('path');
const { Pool } = require('pg');
const cors = require('cors');
const fs = require('fs');
const https = require('https');
const http = require('http');

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

// Basic security settings
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for development
    strictTransportSecurity: false // Disable HSTS
}));
app.disable('x-powered-by');
app.use(cors());

// Body parsers
app.use(express.json({ limit: '1kb' }));
app.use(express.urlencoded({ extended: true, limit: '1kb' }));

// Inject configuration
app.use((req, res, next) => {
  // If the request is for an HTML file
  if (req.path.endsWith('.html') || req.path === '/') {
    // Save the original send function
    const originalSend = res.send;
    
    // Override the send function
    res.send = function(body) {
      // Only modify HTML responses
      if (typeof body === 'string' && body.includes('<!DOCTYPE html>')) {
        // Extract hostname and properly format URLs
        let serverHost = process.env.SERVER || 'localhost';
        if (serverHost.startsWith('http://')) {
          serverHost = serverHost.substring(7);
        } else if (serverHost.startsWith('https://')) {
          serverHost = serverHost.substring(8);
        }
        
        // Use the same protocol as the request
        const protocol = req.protocol; // 'http' or 'https'
        const host = `${serverHost}:${process.env.PORT || '8060'}`;
        
        // Define the config script with values from environment variables
        const configScript = `
        <script>
          // Server-injected configuration 
          window.SERVER_CONFIG = {
            server: "${serverHost}",
            port: "${process.env.PORT || '8060'}",
            apiUrl: "${protocol}://${host}/api"
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

// Static files
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use(express.static(__dirname));

// API endpoints
app.get('/api/config', (req, res) => {
    res.json({
        server: process.env.SERVER || 'localhost',
        port: process.env.PORT || 8060,
        apiUrl: `${req.protocol}://${req.headers.host}/api`
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

// Self-signed certificate options
const selfSignedOptions = {
    key: fs.readFileSync(path.join(__dirname, './cert/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, './cert/cert.pem'))
};

// Start both HTTP and HTTPS servers
const PORT = process.env.PORT || 8060;
const SERVER = process.env.SERVER || 'localhost';

// Extract hostname from SERVER variable
let serverHost = SERVER;
if (serverHost.startsWith('http://')) {
    serverHost = serverHost.substring(7);
} else if (serverHost.startsWith('https://')) {
    serverHost = serverHost.substring(8);
}

// Create HTTP server
const httpServer = http.createServer(app);
httpServer.listen(PORT, () => {
    console.log(`HTTP server running on http://${serverHost}:${PORT}`);
});

// Create HTTPS server on port+1 (e.g., 8061 if HTTP is 8060)
const httpsServer = https.createServer(selfSignedOptions, app);
httpsServer.listen(parseInt(PORT) + 1, () => {
    console.log(`HTTPS server running on https://${serverHost}:${parseInt(PORT) + 1}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP/HTTPS servers');
    httpServer.close(() => console.log('HTTP server closed'));
    httpsServer.close(() => console.log('HTTPS server closed'));
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP/HTTPS servers');
    httpServer.close(() => console.log('HTTP server closed'));
    httpsServer.close(() => console.log('HTTPS server closed'));
});
