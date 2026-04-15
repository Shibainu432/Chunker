const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');
const multer = require('multer');
const fs = require('fs');
const extract = require('extract-zip');
const app = express();

// ============================================
// CORS Configuration (SINGLE, CLEAN SETUP)
// ============================================
const allowedOrigins = [
    "https://shibainu432.github.io",
    "https://shibainu432.github.io/Chunker",
    "http://localhost:3000",
    "http://localhost:10000"
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        
        // Check if origin is in whitelist or ends with .render.com
        if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.render.com')) {
            return callback(null, true);
        }
        
        // Log unexpected origins but allow (for debugging)
        console.log('CORS request from:', origin);
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.options('*', cors());
app.use(express.json());

// ============================================
// Directory Setup
// ============================================
const uploadDir = path.join(__dirname, 'uploads'); 
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const buildPath = path.join(__dirname, '..', 'app', 'ui', 'build');
app.use(express.static(buildPath));

// ============================================
// Health Check Endpoint
// ============================================
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

// ============================================
// File Upload & Conversion Endpoint
// ============================================
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
    console.log('File received:', file ? file.originalname : 'NONE');
    
    if (!file) {
        console.error('ERROR: No file received');
        return res.status(400).json({ error: "No file received by server" });
    }

    console.log('File size:', file.size, 'bytes');
    
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

// ============================================
// Catch-all route for React SPA
// ============================================
// API routes must be defined BEFORE this
app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: "API endpoint not found" });
    }
    res.sendFile(path.join(buildPath, 'index.html'));
});

// ============================================
// Start Server
// ============================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`CORS allowed origins:`, allowedOrigins.join(', '));
});
