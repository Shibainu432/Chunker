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
    origin: true, // Dynamically allow whatever origin is sending the request
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Add this "Pre-flight" handler manually just in case
app.options('*', cors());

app.use(express.json());
app.use(express.static(buildPath));

// Multer setup with specific destination
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

app.post('/api/convert', upload.single('file'), (req, res) => {
    // 1. Get the file and the version choice from the request
    const file = req.file;
    const targetVersion = req.body.targetVersion || 'JE_1_21'; // Default if user didn't pick
    
    console.log(`Received file: ${file ? file.filename : "None"}. Target: ${targetVersion}`);

    if (!file) {
        return res.status(400).json({ error: "No file received by server" });
    }

    const inputPath = file.path;
    const jarPath = path.join(__dirname, 'chunker.jar');
    
    // 2. Create a unique folder for the conversion output
    const conversionId = Date.now();
    const outputDir = path.join(uploadDir, 'output-' + conversionId);
    const finalZipPath = path.join(uploadDir, 'converted-' + conversionId + '.zip');

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // 3. The Chunker Command
    // -f is the format (JE_1_21), -i is input, -o is output folder
    const command = `java -jar "${jarPath}" -f ${targetVersion} -i "${inputPath}" -o "${outputDir}"`;

    console.log("Executing Chunker...");

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Chunker failed: ${stderr || error.message}`);
            return res.status(500).json({ error: "Java conversion failed", details: stderr || error.message });
        }

        // 4. IMPORTANT: Chunker outputs a FOLDER. We need to zip it to send it.
        // We use a simple zip command (available on Render's Linux environment)
        const zipCommand = `zip -r "${finalZipPath}" .`;
        
        exec(zipCommand, { cwd: outputDir }, (zipErr) => {
            if (zipErr) {
                console.error("Zipping failed:", zipErr);
                return res.status(500).json({ error: "Failed to package world" });
            }

            // 5. Send the finished ZIP to the user
            res.download(finalZipPath, 'converted_world.zip', (err) => {
                // Cleanup: Delete the temp files after sending
                try {
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    // fs.rmSync(outputDir, { recursive: true, force: true });
                    // fs.unlinkSync(finalZipPath); 
                } catch (cleanupErr) {
                    console.error("Cleanup error:", cleanupErr);
                }
            });
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
