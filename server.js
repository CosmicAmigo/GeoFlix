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
if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set. Please configure it in your deployment environment.');
    process.exit(1);
}
const pool = mysql.createPool(process.env.DATABASE_URL + "?ssl-mode=REQUIRED");

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve static files from root

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

// 4. LEADERBOARD API
async function getLeaderboardData(pointType, timePeriod) {
    let whereClause = '';
    if (timePeriod !== 'lifetime') {
        const interval = timePeriod === '1week' ? '1 WEEK' : timePeriod === '1month' ? '1 MONTH' : '1 YEAR';
        whereClause = `WHERE l.created_at >= DATE_SUB(NOW(), INTERVAL ${interval})`;
    }

    let selectPoints = '';
    if (pointType === 'physical') {
        selectPoints = 'SUM(l.physical_points)';
    } else if (pointType === 'virtual') {
        selectPoints = 'SUM(l.virtual_points)';
    } else { // both
        selectPoints = 'SUM(l.physical_points + l.virtual_points)';
    }

    const query = `
        SELECT u.name as username, ${selectPoints} as score, 
               TIMESTAMPDIFF(DAY, u.account_created_at, NOW()) as account_age,
               ROW_NUMBER() OVER (ORDER BY ${selectPoints} DESC) as rank
        FROM leaderboard l
        JOIN users u ON l.user_id = u.id
        ${whereClause}
        GROUP BY u.id, u.name, u.account_created_at
        ORDER BY score DESC
    `;

    try {
        const [rows] = await pool.execute(query);
        return rows;
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        throw error;
    }
}

app.get('/api/leaderboard', async (req, res) => {
    const pointType = req.query.pointType || 'both';
    const timePeriod = req.query.timePeriod || '1week';
    try {
        const data = await getLeaderboardData(pointType, timePeriod);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// 5. USER PROFILE API
app.get('/api/profile', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.substring(7);
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const email = decoded.email;
        // Get user
        const [userRows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (userRows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userRows[0];
        // Get points and rank from leaderboard
        const [pointRows] = await pool.execute('SELECT SUM(physical_points + virtual_points) as total_points FROM leaderboard WHERE user_id = ?', [user.id]);
        const totalPoints = pointRows[0]?.total_points || 0;
        // Get rank
        const [rankRows] = await pool.execute('SELECT COUNT(*) + 1 as rank FROM (SELECT user_id, SUM(physical_points + virtual_points) as total FROM leaderboard GROUP BY user_id HAVING total > ?) as higher', [totalPoints]);
        const rank = rankRows[0]?.rank || 1;
        res.json({
            name: user.name,
            email: user.email,
            points: totalPoints,
            rank: rank
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`Geoflix running on port ${PORT}`));