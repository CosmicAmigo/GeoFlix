const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'geoflix-default-secret';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 1. DATABASE CONNECTION (Using your DATABASE_URL)
const pool = mysql.createPool(process.env.DATABASE_URL + "?ssl-mode=REQUIRED");

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist'))); // Serve Vite build

// 2. GOOGLE LOGIN ROUTE
app.post('/api/google-login', async (req, res) => {
    try {
        const { token } = req.body;
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const { email, name } = ticket.getPayload();

        // Check if user exists in MySQL
        let [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        let user = rows[0];

        if (!user) {
            // Create user if they don't exist
            await pool.execute(
                'INSERT INTO users (email, name, carbonFootprint) VALUES (?, ?, ?)',
                [email, name, 0]
            );
            [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
            user = rows[0];
        }

        const sessionToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token: sessionToken, user });
    } catch (error) {
        res.status(500).json({ error: 'Google Auth failed' });
    }
});

// 3. ACTION LOGGING (From your project guide)
app.post('/api/actions', async (req, res) => {
    const { email, action, impact } = req.body; // In production, get email from JWT
    try {
        await pool.execute(
            'INSERT INTO actions (user_email, action_name, impact_value) VALUES (?, ?, ?)',
            [email, action, impact]
        );
        await pool.execute(
            'UPDATE users SET carbonFootprint = carbonFootprint + ? WHERE email = ?',
            [impact, email]
        );
        res.json({ message: 'Action logged to AivenDB successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Database update failed' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => console.log(`Geoflix running on port ${PORT}`));