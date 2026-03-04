const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// This finds the 'build' folder we copied in the Dockerfile
const buildPath = path.resolve(process.cwd(), 'build');

// 1. Middleware & CORS
// Add your specific GitHub URL here to allow the frontend to talk to the backend
app.use(cors({
  origin: [
    'https://shibainu432.github.io', 
    'https://chunker-2.onrender.com', 
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// 2. Serve static files (The React Frontend)
app.use(express.static(buildPath));

// 3. The API Route (The "Bridge")
app.post('/api/convert', (req, res) => {
  console.log("POST request received at /api/convert");
  res.json({ 
    message: "Success! Render received the request from GitHub Pages.",
    status: "connected" 
  });
});

// 4. Catch-all route (Returns index.html for any non-API route)
app.get('*', (req, res) => {
  const indexPath = path.join(buildPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(500).send("Frontend build missing in Docker container.");
    }
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
