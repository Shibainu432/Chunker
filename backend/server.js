const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// Use process.cwd() to ensure we find /app/build in the Docker container
const buildPath = path.resolve(process.cwd(), 'build');

console.log("Checking for build folder at:", buildPath);

// 1. Middleware
app.use(cors({
  origin: ['https://chunker-2.onrender.com', 'https://shibainu432.github.io/Chunker', 'http://localhost:3000', 'http://localhost:10000'],
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// 2. Serve static files
app.use(express.static(buildPath));

// 3. YOUR MISSING API ROUTE
// This tells the server what to do when the frontend clicks the button
app.post('/api/convert', (req, res) => {
  console.log("POST request received at /api/convert");
  // For now, we send a success message to prove the link is working
  res.json({ message: "Success! The server found the convert route." });
});

// 4. Catch-all route to serve the frontend
app.get('*', (req, res) => {
  const indexPath = path.join(buildPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error("ERROR: Could not find index.html at", indexPath);
      res.status(500).send(Frontend missing. Server is looking in: ${indexPath});
    }
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(Server running on port ${PORT}));
