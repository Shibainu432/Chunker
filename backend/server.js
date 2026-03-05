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
    origin: true, 
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.options('*', cors());

app.use(express.json());
app.use(express.static(buildPath));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

app.post('/api/convert', upload.single('file'), (req, res) => {
    const file = req.file;
    const targetVersion = req.body.targetVersion || 'JE_1_21'; 
    
    console.log(`Received file: ${file ? file.filename : "None"}. Target: ${targetVersion}`);

    if (!file) {
        return res.status(400).json({ error: "No file received by server" });
    }

    const inputPath = file.path;
    const jarPath = path.join(__dirname, 'chunker.jar');
    const conversionId = Date.now();
    const outputDir = path.join(uploadDir, 'output-' + conversionId);
    const finalZipPath = path.join(uploadDir, 'converted-' + conversionId + '.zip');

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const command = `java -jar "${jarPath}" -f ${targetVersion} -i "${inputPath}" -o "${outputDir}"`;

    console.log("Executing Chunker...");

    exec(command, (error, stdout, stderr) => {
        // --- UPDATED ERROR LOGGING START ---
        if (error) {
            console.error("Chunker Failed Details:", stderr);
            // This sends the actual Java/Chunker error back to your frontend
            return res.status(500).json({ 
                error: "Java conversion failed", 
                details: stderr || stdout || error.message 
            });
        }
        // --- UPDATED ERROR LOGGING END ---

        const zipCommand = `zip -r "${finalZipPath}" .`;
        
        exec(zipCommand, { cwd: outputDir }, (zipErr) => {
            if (zipErr) {
                console.error("Zipping failed:", zipErr);
                return res.status(500).json({ error: "Failed to package world" });
            }

            res.download(finalZipPath, 'converted_world.zip', (err) => {
                try {
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    // Keeping cleanup commented out for now so you can debug files on the server if needed
                    // fs.rmSync(outputDir, { recursive: true, force: true });
                    // fs.unlinkSync(finalZip
