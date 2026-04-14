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

// 2. CORS: Allow requests from GitHub Pages and Render
app.use(cors({
    origin: [
        "https://shibainu432.github.io",
        /\.render\.com$/
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
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

app.post('/api/convert', upload.single('file'), (req, res) => {
    const file = req.file;
    const targetVersion = req.body.targetVersion || 'JAVA_1_21';
    
    console.log('\n=== CONVERSION REQUEST ===');
    console.log('Target version:', targetVersion);
    
    if (!file) {
        console.error('ERROR: No file received');
        return res.status(400).json({ error: "No file received by server" });
    }

    console.log('File received:', file.originalname, '(' + file.size + ' bytes)');
    
    const inputPath = file.path;
    const jarPath = path.join(__dirname, 'chunker.jar');
    const conversionId = Date.now();
    const outputDir = path.join(uploadDir, 'output-' + conversionId);
    
    // CHECK IF JAR EXISTS - THIS IS THE KEY!
    if (!fs.existsSync(jarPath)) {
        console.error('ERROR: JAR not found at:', jarPath);
        return res.status(500).json({ 
            error: "Server misconfiguration: chunker.jar not found",
            jarPath: jarPath,
            hint: "Is chunker.jar in the backend folder?"
        });
    }
    
    console.log('JAR found at:', jarPath);
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const command = `timeout 300 java -jar "${jarPath}" --input "${inputPath}" --output "${outputDir}" --target "${targetVersion}"`;
    
    console.log('Executing:', command);
    
    exec(command, { maxBuffer: 10 * 1024 * 1024, timeout: 320000 }, (error, stdout, stderr) => {
        console.log('\n=== CONVERSION RESULT ===');
        
        if (stdout) console.log('STDOUT:', stdout);
        if (stderr) console.log('STDERR:', stderr);
        
        if (error) {
            console.error('ERROR:', error.message);
            
            try {
                fs.rmSync(outputDir, { recursive: true, force: true });
                fs.unlinkSync(inputPath);
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
            return res.status(500).json({ error: "Output directory not readable" });
        }
        
        console.log('Output files found:', outputFiles.join(', '));
        
        if (outputFiles.length === 0) {
            console.error('No output files generated');
            return res.status(500).json({ error: "Conversion produced no output" });
        }

        const convertedFile = outputFiles.find(f => f.endsWith('.zip') || f.endsWith('.mcworld'));
        if (!convertedFile) {
            console.error('No converted file found in output');
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
                    fs.rmSync(outputDir, { recursive: true, force: true });
                    fs.unlinkSync(inputPath);
                    console.log('Cleanup completed');
                } catch (e) {
                    console.error('Cleanup error:', e);
                }
            }, 1000);
        });
    });
});

// Catch-all route to serve React's index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
