const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'climate-action-session',
  resave: false,
  saveUninitialized: false
}));

// Serve static files
app.use(express.static(path.join(__dirname)));

// Simple file-based user storage (replace with database in production)
const USERS_FILE = path.join(__dirname, 'users.json');

// Helper functions
const readUsers = () => {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
};

const writeUsers = (users) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

// Routes
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const users = readUsers();

    if (users[email]) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    users[email] = {
      id: Date.now().toString(),
      email,
      name,
      password: hashedPassword,
      carbonFootprint: 0,
      actions: [],
      createdAt: new Date().toISOString()
    };

    writeUsers(users);
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: users[email].id,
        email,
        name,
        carbonFootprint: users[email].carbonFootprint
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = readUsers();
    const user = users[email];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        carbonFootprint: user.carbonFootprint
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

app.get('/api/profile', authenticateToken, (req, res) => {
  const users = readUsers();
  const user = users[req.user.email];

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    carbonFootprint: user.carbonFootprint,
    actions: user.actions
  });
});

app.post('/api/actions', authenticateToken, (req, res) => {
  const { action, impact } = req.body;
  const users = readUsers();
  const user = users[req.user.email];

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.actions.push({
    id: Date.now().toString(),
    action,
    impact,
    date: new Date().toISOString()
  });

  user.carbonFootprint += impact;
  writeUsers(users);

  res.json({ message: 'Action logged successfully' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});