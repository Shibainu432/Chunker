const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 10000;

// 1. Allow GitHub Pages to talk to this server
app.use(cors());
app.use(express.json());

// 2. Setup file storage (uploads folder)
const upload = multer({ dest: 'uploads/' });

app.get('/', (req, res) => {
  res.send('Chunker Service is Running!');
});

// 3. The actual UPLOAD endpoint the UI is looking for
app.post('/api/convert', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const inputPath = req.file.path;
  const outputPath = path.join(__dirname, 'uploads', `converted-${req.file.originalname}`);

  // This is where the magic happens - calling the Chunker Jar
  // Update this command based on what conversion you want (e.g., to Bedrock)
  const command = `java -jar /app/chunker.jar --input "${inputPath}" --output "${outputPath}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${stderr}`);
      return res.status(500).json({ error: 'Conversion failed', details: stderr });
    }
    
    // Send the converted file back to the user
    res.download(outputPath, () => {
      // Clean up files after download
      fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    });
  });
});

app.listen(port, () => {
  console.log(`Chunker server running on port ${port}`);
});
