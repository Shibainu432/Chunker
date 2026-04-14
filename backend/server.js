// backend/server.js

const express = require('express');
const fs = require('fs');
const { exec } = require('child_process');
const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'UP' });
});

// Function to check if chunker.jar exists
function checkJarExists() {
    return fs.existsSync('./chunker.jar');
}

// Route to execute chunker.jar
app.post('/api/chunk', (req, res) => {
    // Check if the JAR file exists
    if (!checkJarExists()) {
        console.error('Error: chunker.jar not found.');
        return res.status(500).json({ error: 'Internal Server Error: chunker.jar is missing.' });
    }

    exec('java -jar chunker.jar', (error, stdout, stderr) => {
        if (error) {
            console.error(`Execution error: ${error.message}`);
            return res.status(500).json({ error: 'Failed to execute chunker.jar.', details: stderr });
        }
        if (stderr) {
            console.warn(`Warning: ${stderr}`);
        }
        console.log(`Output: ${stdout}`);
        res.status(200).json({ message: 'Chunking completed successfully', output: stdout });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});