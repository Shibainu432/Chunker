const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// Use process.cwd() to ensure we find /app/build in the Docker container
const buildPath = path.resolve(process.cwd(), 'build');

console.log("Checking for build folder at:", buildPath);

// 1. CORS Configuration
app.use(cors({
  origin: ['https://shibainu432.github.io', 'https://chunker-2.onrender.com', 'http://localhost:3000', 'http://localhost:10000'], 
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// 2. Serve static files
// We only need this once. Using buildPath (process.cwd) is safer for Docker.
app.use(express.static(buildPath));

// ... [Insert your /api/convert routes here] ...

// 3. Catch-all route to serve the frontend
app.get('*', (req, res) => {
    const indexPath = path.join(buildPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error("ERROR: Could not find index.html at", indexPath);
            res.status(500).send(`Frontend missing. Server is looking in: ${indexPath}`);
        }
    }); // Added missing closing parenthesis for res.sendFile
}); // Added missing closing brace for app.get

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
