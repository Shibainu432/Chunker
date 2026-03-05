const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');
const multer = require('multer');
const fs = require('fs');
const app = express();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const buildPath = path.resolve(process.cwd(), 'build');

// CORS must be configured precisely
app.use(cors({
    origin: ['https://shibainu432.github.io', 'https://chunker-2.onrender.com'],
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json());
app.use(express.static(buildPath));

// Multer setup with specific destination
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

app.post('/api/convert', upload.single('file'), (req, res) => {
    console.log("File received:", req.file ? req.file.filename : "No file");

    if (!req.file) {
        return res.status(400).json({ error: "No file received by server" });
    }

    const inputPath = req.file.path;
    const outputPath = path.join(uploadDir, 'converted-' + Date.now() + '.zip');
    const jarPath = path.join(__dirname, 'chunker.jar');

    // Basic Java execution command
    const outputDir = path.join(uploadDir, 'output-' + Date.now());
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    const command = `java -jar "${jarPath}" -f JE_1_20_1 -i "${inputPath}" -o "${outputDir}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Execution Error: ${error.message}`);
            // Log stdout and stderr so we can see what Chunker says
            console.log(`Chunker Output: ${stdout}`);
            console.error(`Chunker Error: ${stderr}`);
            return res.status(500).json({ error: "Java conversion failed", details: stderr || error.message });
        }
        
        // If successful, send the file back
        res.download(outputPath, 'converted_world.zip', (err) => {
            if (err) console.error("Download Error:", err);
            // Cleanup: Delete files after download to save space
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            // Note: Don't unlink outputPath immediately or the download fails
        });
    });
});

// Catch-all
app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
