require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

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
app.use(cors());
app.use(express.json());

// New API endpoint to get services
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

/**
 * Endpoint to get highlighted news.
 * Table: sitio.noticias
 */
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

/**
 * Endpoint to get services data.
 * Table: sitio.productos_servicios
 */
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

/**
 * Endpoint to get FAQ (Preguntas Frecuentes).
 * Table: sitio.preguntas
 */
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

/**
 * Endpoint to get empresas data.
 * Table: sitio.empresas (Assumed based on existing endpoint)
 */
app.get('/api/get-empresas', async (req, res) => {
    try {
        const result = await pool.query('SELECT empresa FROM sitio.empresas ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching empresas:', error);
        res.status(500).json({ error: 'Database error.' });
    }
});



// Existing endpoint for general query execution (if still needed)
app.post('/api/query', async (req, res) => {
    const { query } = req.body;

    // Basic validation to prevent dangerous queries
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return res.status(400).json({ error: 'Invalid query.' });
    }

    try {
        // Execute query safely
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ error: 'Database error.' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error.' });
});

// Start the server
app.listen(port, () => {
    console.log(`Middleware API running at http://localhost:${port}`);
});
