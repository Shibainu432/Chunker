const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');
const multer = require('multer');
const fs = require('fs');
const app = express();

// 1. Pathing Fix: Ensure we find the 'uploads' and 'build' folders correctly
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. CORS Fix: This allows your GitHub Pages site to talk to this Render server
app.use(cors({
    origin: ["https://yourusername.github.io", "http://localhost:3000"], // REPLACE 'yourusername' with your GitHub name
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.options('*', cors());
app.use(express.json());

// 3. Static Files: Serve the React frontend from the 'build' folder
app.use(express.static(path.join(__dirname, 'build')));

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
    const jarPath = path.join(__dirname, 'chunker.jar');
    const conversionId = Date.now();
    const outputDir = path.join(uploadDir, 'output-' + conversionId);
    const finalZipPath = path.join(uploadDir, 'converted-' + conversionId + '.zip');

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // The Java command to run the converter
    const command = `java -jar
