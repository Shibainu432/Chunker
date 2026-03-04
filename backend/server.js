const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// 1. Allow GitHub Pages to talk to this API
app.use(cors({
  origin: ['https://your-github-username.github.io', 'http://localhost:3000'], 
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// 2. Serve the INTERNAL frontend (Render's copy)
app.use(express.static(path.join(__dirname, 'build')));

// ... your existing upload/conversion routes here ...

// 3. Make sure the Internal frontend handles routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
