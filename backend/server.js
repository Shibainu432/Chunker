const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');
const multer = require('multer');
const fs = require('fs');
const app = express();

// 1. Pathing Fix: Since server.js is in 'backend/', go UP (..) then into 'uploads'
const uploadDir = path.join(__dirname, 'uploads'); 
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. CORS: Replace 'yourusername' with Shibainu432
app.use(cors({
    origin: [
        "https://shibainu432.github.io", // GitHub Frontend
        /\.render\.com$/                  // Render Frontend (mirrored)
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
}));

app.options('*', cors());
app.use(express.json());

// 3. Static Files Fix: Reach UP and over into 'app/build'
// This tells the backend where the website files are
const buildPath = path.join(__dirname, '..', 'app', 'build');
app.use(express.static(buildPath));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

app.post('/api/convert', upload.single('file'), (req, res) => {
    const file = req.file;
    const targetVersion = req.body.targetVersion || 'JAVA_1_21';
    
    if (!file) {
        return res.status(400).json({ error: "No file received by server" });
    }

    const inputPath = file.path;
    // Assuming chunker.jar is in the backend folder with server.js
    const jarPath = path.join(__dirname, 'chunker.jar');
    const conversionId = Date.now();
    const outputDir = path.join(uploadDir, 'output-' + conversionId);
    
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // Java command logic continues below...
    const command = `java -jar "${jarPath}" --input "${inputPath}" --output "${outputDir}" --target "${targetVersion}"`;
    
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).json({ error: "Conversion failed" });
        }
        res.json({ message: "Conversion successful!", id: conversionId });
    });
});

// Catch-all route to serve React's index.html for any non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
