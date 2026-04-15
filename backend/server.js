const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');
const multer = require('multer');
const fs = require('fs');
const extract = require('extract-zip');
const app = express();

app.use(cors({
    origin: 'htpps://shibainu432.github.io',
    credentials: true,
    methids: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

// 1. Pathing Fix: Since server.js is in 'backend/', go UP (..) then into 'uploads'
const uploadDir = path.join(__dirname, 'uploads'); 
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. CORS: Allow requests from GitHub Pages and Render
const allowedOrigins = [
    "https://shibainu432.github.io",
    "https://shibainu432.github.io/Chunker",
    "http://localhost:3000",
    "http://localhost:10000"
];

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.render.com')) {
            return callback(null, true);
        }
        return callback(null, true); // Temporarily allow all for debugging if needed, or change to restricted
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.options('*', cors());
app.use(express.json());

// 3. Static Files Fix: Reach UP and over into 'app/ui/build'
const buildPath = path.join(__dirname, '..', 'app', 'ui', 'build');
app.use(express.static(buildPath));

// DIAGNOSTIC ENDPOINT
app.get('/api/health', (req, res) => {
    const jarPath = path.join(__dirname, 'chunker.jar');
    const jarExists = fs.existsSync(jarPath);
    
    console.log('=== HEALTH CHECK ===');
    console.log('JAR exists:', jarExists);
    console.log('JAR path:', jarPath);
    console.log('Upload dir:', uploadDir);
    console.log('Build path:', buildPath);
    
    res.json({
        status: 'ok',
        backend: 'running',
        jarExists: jarExists,
        jarPath: jarPath,
        uploadDir: uploadDir,
        buildPath: buildPath,
        timestamp: new Date().toISOString()
    });
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

app.post('/api/convert', upload.single('file'), async (req, res) => {
    const file = req.file;
    const targetVersion = req.body.targetVersion || 'JAVA_1_21';
    
    console.log('\n=== CONVERSION REQUEST ===');
    console.log('Target version:', targetVersion);
    
    if (!file) {
        console.error('ERROR: No file received');
        return res.status(400).json({ error: "No file received by server" });
    }

    console.log('File received:', file.originalname, '(' + file.size + ' bytes)');
    
    const uploadedZip = file.path;
    const jarPath = path.join(__dirname, 'chunker.jar');
    const conversionId = Date.now();
    const extractedDir = path.join(uploadDir, 'extracted-' + conversionId);
    const outputDir = path.join(uploadDir, 'output-' + conversionId);
    
    // CHECK IF JAR EXISTS
    if (!fs.existsSync(jarPath)) {
        console.error('ERROR: JAR not found at:', jarPath);
        return res.status(500).json({ 
            error: "Server misconfiguration: chunker.jar not found",
            jarPath: jarPath,
            hint: "Is chunker.jar in the backend folder?"
        });
    }
    
    console.log('JAR found at:', jarPath);
    
    // Create directories
    if (!fs.existsSync(extractedDir)) {
        fs.mkdirSync(extractedDir, { recursive: true });
    }
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
        // Extract the uploaded ZIP file
        console.log('Extracting ZIP file...');
        await extract(uploadedZip, { dir: extractedDir });
        console.log('ZIP extracted to:', extractedDir);
        
        // Find the world directory (could be nested)
        let worldDir = extractedDir;
        const contents = fs.readdirSync(extractedDir);
        
        // If the extracted folder only contains one folder, use that as the world directory
        if (contents.length === 1 && fs.statSync(path.join(extractedDir, contents[0])).isDirectory()) {
            worldDir = path.join(extractedDir, contents[0]);
            console.log('Using nested world directory:', worldDir);
        }

        const command = `timeout 300 java -jar "${jarPath}" -i "${worldDir}" -o "${outputDir}" -f "${targetVersion}"`;
        
        console.log('Executing:', command);
        
        exec(command, { maxBuffer: 10 * 1024 * 1024, timeout: 320000 }, (error, stdout, stderr) => {
            console.log('\n=== CONVERSION RESULT ===');
            
            if (stdout) console.log('STDOUT:', stdout);
            if (stderr) console.log('STDERR:', stderr);
            
            if (error) {
                console.error('ERROR:', error.message);
                
                try {
                    fs.rmSync(extractedDir, { recursive: true, force: true });
                    fs.rmSync(outputDir, { recursive: true, force: true });
                    fs.unlinkSync(uploadedZip);
                } catch (e) {
                    console.error('Cleanup error:', e);
                }
                
                if (error.killed) {
                    return res.status(500).json({ error: "Conversion timed out - world may be too large" });
                }
                return res.status(500).json({ error: `Conversion failed: ${error.message}` });
            }

            let outputFiles = [];
            try {
                outputFiles = fs.readdirSync(outputDir);
            } catch (e) {
                console.error('Could not read output directory:', e);
                
                try {
                    fs.rmSync(extractedDir, { recursive: true, force: true });
                    fs.unlinkSync(uploadedZip);
                } catch (e2) {}
                
                return res.status(500).json({ error: "Output directory not readable" });
            }
            
            console.log('Output files found:', outputFiles.join(', '));
            
            if (outputFiles.length === 0) {
                console.error('No output files generated');
                
                try {
                    fs.rmSync(extractedDir, { recursive: true, force: true });
                    fs.unlinkSync(uploadedZip);
                } catch (e) {}
                
                return res.status(500).json({ error: "Conversion produced no output" });
            }

            const convertedFile = outputFiles.find(f => f.endsWith('.zip') || f.endsWith('.mcworld'));
            if (!convertedFile) {
                console.error('No converted file found in output');
                
                try {
                    fs.rmSync(extractedDir, { recursive: true, force: true });
                    fs.unlinkSync(uploadedZip);
                } catch (e) {}
                
                return res.status(500).json({ error: "No converted file found" });
            }

            const filePath = path.join(outputDir, convertedFile);
            console.log('Sending file:', filePath);
            
            res.download(filePath, convertedFile, (err) => {
                if (err) {
                    console.error('Download error:', err);
                } else {
                    console.log('Download completed successfully');
                }
                
                setTimeout(() => {
                    try {
                        fs.rmSync(extractedDir, { recursive: true, force: true });
                        fs.rmSync(outputDir, { recursive: true, force: true });
                        fs.unlinkSync(uploadedZip);
                        console.log('Cleanup completed');
                    } catch (e) {
                        console.error('Cleanup error:', e);
                    }
                }, 1000);
            });
        });
    } catch (extractError) {
        console.error('Extract error:', extractError.message);
        
        try {
            fs.rmSync(extractedDir, { recursive: true, force: true });
            fs.unlinkSync(uploadedZip);
        } catch (e) {
            console.error('Cleanup error:', e);
        }
        
        return res.status(500).json({ error: `Failed to extract ZIP: ${extractError.message}` });
    }
});

// IMPORTANT: API routes must be defined BEFORE the catch-all route

// Catch-all route to serve React's index.html (ONLY for non-API routes)
app.get('*', (req, res) => {
    // Don't serve index.html for API routes that failed
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: "API endpoint not found" });
    }
    res.sendFile(path.join(buildPath, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
