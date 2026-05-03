# GeoFlix
Changing the earth's climate state

## Features

- **Climate Awareness**: Scroll through an engaging narrative about climate change
- **User Accounts**: Register and login to track your personal climate impact
- **Action Logging**: Log climate-friendly actions and track your carbon footprint reduction
- **Personal Dashboard**: View your progress and see your impact

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Open your browser to `http://localhost:3000`

## User Accounts System

The site now includes a fully functional user accounts system:

### Registration
- Click "Join Us" in the hero section
- Fill out your name, email, and password
- Your account will be created and you'll be automatically logged in

### Login
- Click "Login" in the hero section
- Enter your email and password
- Access your personal dashboard

### Dashboard Features
- **Carbon Footprint Tracker**: See your total CO₂ impact
- **Action Logging**: Record climate actions you've taken
- **Progress Tracking**: Monitor your environmental contributions

### Logging Actions
- Click "Log New Action" in your dashboard
- Describe the action (e.g., "Switched to LED bulbs")
- Enter the estimated CO₂ reduction in tons per year
- Your total footprint will be updated automatically

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **Authentication**: JWT tokens
- **Data Storage**: JSON file (easily replaceable with a database)

## API Endpoints

- `POST /api/register` - User registration
- `POST /api/login` - User authentication
- `GET /api/profile` - Get user profile and actions
- `POST /api/actions` - Log a new climate action
