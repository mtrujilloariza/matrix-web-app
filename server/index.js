import express from 'express';
import { exec } from 'child_process';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';

const app = express();

// Add CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Create matrix-images directory if it doesn't exist
const matrixImagesDir = path.join(process.cwd(), 'matrix-images');
if (!fs.existsSync(matrixImagesDir)) {
  fs.mkdirSync(matrixImagesDir);
}

app.use(bodyParser.json({ limit: '10mb' })); // Increase limit for base64 images

// Endpoint to execute a bash command
// app.get('/api/runcmd', async (req, res) => {
//   const { command } = req.query;
//   try {
// 	  console.log(command)
//     const result = await runCommand(command);
//     res.send(result);
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// });

app.get('/api/startLEDServer', (req, res) => {
  try {
    exec('sudo systemctl start led-matrix', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error starting LED server: ${error}`);
        res.status(500).send('Failed to start LED server');
        return;
      }
      console.log('LED server started successfully');
      res.send('LED Server started');
    });
  } catch (error) {
    console.error('Error starting LED server:', error);
    res.status(500).send('Failed to start LED server');
  }
});

app.get('/api/stopLEDServer', (req, res) => {
  try {
    exec('sudo systemctl stop led-matrix', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error stopping LED server: ${error}`);
        res.status(500).send('Failed to stop LED server');
        return;
      }
      console.log('LED server stopped successfully');
      res.send('LED Server stopped');
    });
  } catch (error) {
    console.error('Error stopping LED server:', error);
    res.status(500).send('Failed to stop LED server');
  }
});

app.get('/api/restartLEDServer', (req, res) => {
  try {
    exec('sudo systemctl restart led-matrix', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error restarting LED server: ${error}`);
        res.status(500).send('Failed to restart LED server');
        return;
      }
      console.log('LED server restarted successfully');
      res.send('LED Server restarted');
    });
  } catch (error) {
    console.error('Error restarting LED server:', error);
    res.status(500).send('Failed to restart LED server');
  }
});

app.post('/api/saveMatrixImage', (req, res) => {
  try {
    const { imageData, artistName, artworkName } = req.body;
    
    if (!imageData || !artistName || !artworkName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: imageData, artistName, or artworkName' 
      });
    }
    
    // Remove the data URL prefix
    const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
    
    // Create a unique hash
    const timestamp = new Date().getTime();
    const randomHash = Math.random().toString(36).substring(2, 8);
    
    // Create filename with artist name, artwork name, and hash
    const safeArtistName = artistName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const safeArtworkName = artworkName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const filename = `${safeArtistName}-${safeArtworkName}-${timestamp}-${randomHash}.png`;
    const filePath = path.join(matrixImagesDir, filename);
    
    // Save the image
    fs.writeFileSync(filePath, base64Data, 'base64');
    
    res.json({ 
      success: true, 
      filename,
      message: 'Artwork saved successfully'
    });
  } catch (error) {
    console.error('Error saving matrix image:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.post('/api/sendImage', (req, res) => {
  if(true){
    console.log(`curl -s ${req.body.img} | ./server/bin/send-image -g 64x64 -h localhost -`)

    exec(`curl -s ${req.body.img} | ./server/bin/send-image -g 64x64 -h localhost -`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);
    });
    res.send('Img recieved')
  } else {
    res.send('No LED Server running')
  }
})

// Test LED service endpoint
app.get('/api/testLEDService', (req, res) => {
  exec('systemctl is-active led-matrix', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error checking LED service status: ${error}`);
      res.status(500).json({ 
        status: 'error',
        message: 'Failed to check LED service status'
      });
      return;
    }
    const isRunning = stdout.trim() === 'active';
    res.json({ 
      status: isRunning ? 'running' : 'stopped',
      message: isRunning ? 'LED service is running' : 'LED service is stopped'
    });
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
