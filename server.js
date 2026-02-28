const express = require('express');
const { exec } = require('child_process');
const app = express();
const port = process.env.PORT || 10000;

// This keeps Render happy by responding to health checks
app.get('/', (req, res) => {
  res.send('Chunker Service is Running!');
});

// An endpoint to trigger a conversion via URL (Example)
app.get('/convert', (req, res) => {
  exec('java -jar /app/chunker.jar --help', (error, stdout, stderr) => {
    if (error) return res.status(500).send(stderr);
    res.send(`<pre>${stdout}</pre>`);
  });
});

app.listen(port, () => {
  console.log(`Chunker wrapper listening at http://localhost:${port}`);
});
