const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process'); // Needed to run Java
const multer = require('multer'); // Needed to handle file uploads
const fs = require('fs');
const app = express();

const buildPath = path.resolve(process.cwd(), 'build');
const upload = multer({ dest: 'uploads/' }); // Temporary folder for uploaded worlds

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error("Multer Error:", error.message);
    return res.status(400).json({ error: `Upload error: ${error.message}. Ensure the field name is 'file'.` });
  }
  next(error);
});

app.use(express.json());
app.use(express.static(buildPath));

// --- THE CONVERT ROUTE ---
// We use upload.single('file') to catch the world file sent from the frontend
app.post('/api/convert', upload.single('file'), (req, res) => {
    console.log("POST request received. Starting conversion...");

    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const inputPath = req.file.path;
    const outputPath = path.join(__dirname, 'converted_world.zip');
    const jarPath = path.join(process.cwd(), 'backend', 'chunker.jar'); // Ensure your jar is named this!

    // The actual command that runs the Java tool
    // Note: You may need to change the arguments (-i, -o, etc) to match your specific jar
    const command = `java -jar "${jarPath}" "${inputPath}" "${outputPath}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Java Error: ${error}`);
            return res.status(500).json({ error: "Java conversion failed." });
        }

        console.log("Conversion complete!");
        
        // Send back a success message and a path to download the file
        res.json({ 
            message: "Conversion Complete!",
            downloadUrl: "/api/download" 
        });
    });
});

// Route to let the user download the finished file
app.get('/api/download', (req, res) => {
    const file = path.join(__dirname, 'converted_world.zip');
    res.download(file);
});

// --- CATCH-ALL ---
app.get('*', (req, res) => {
  const indexPath = path.join(buildPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) res.status(500).send("Frontend build missing.");
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
