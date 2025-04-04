import express from 'express';
import { exec, spawn } from 'child_process';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';

const app = express();
let ftServerProcess = null;

// Function to start ft-server
const startFtServer = () => {
  try {
    ftServerProcess = spawn('sudo', [
      '/home/pi/flaschen-taschen/server/ft-server',
      '--led-rows=64',
      '--led-cols=64',
      '--led-gpio-mapping=adafruit-hat-pwm',
      '--led-slowdown-gpio=5'
    ], {
      stdio: 'inherit',
      detached: true
    });

    ftServerProcess.on('error', (err) => {
      console.error('Failed to start LED server:', err);
    });

    ftServerProcess.on('exit', (code) => {
      console.log('LED server process exited with code:', code);
      ftServerProcess = null;
    });

    console.log('LED server started successfully');
    return true;
  } catch (error) {
    console.error('Error starting LED server:', error);
    return false;
  }
};

// Start ft-server when Node.js server starts
startFtServer();

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

app.use(bodyParser.json({ limit: '10mb' }));

app.get('/api/startLEDServer', (req, res) => {
  try {
    if (ftServerProcess) {
      res.status(400).send('LED server is already running');
      return;
    }

    if (startFtServer()) {
      res.send('LED Server started');
    } else {
      res.status(500).send('Failed to start LED server');
    }
  } catch (error) {
    console.error('Error starting LED server:', error);
    res.status(500).send('Failed to start LED server');
  }
});

app.get('/api/stopLEDServer', (req, res) => {
  try {
    if (!ftServerProcess) {
      res.status(400).send('LED server is not running');
      return;
    }

    process.kill(-ftServerProcess.pid);
    ftServerProcess = null;
    console.log('LED server stopped successfully');
    res.send('LED Server stopped');
  } catch (error) {
    console.error('Error stopping LED server:', error);
    res.status(500).send('Failed to stop LED server');
  }
});

app.get('/api/restartLEDServer', (req, res) => {
  try {
    if (ftServerProcess) {
      process.kill(-ftServerProcess.pid);
      ftServerProcess = null;
    }

    if (startFtServer()) {
      res.send('LED Server restarted');
    } else {
      res.status(500).send('Failed to restart LED server');
    }
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
    
    // Send the image to display if LED server is running
    if (ftServerProcess) {
      exec(`./server/bin/send-image -g 64x64 -h localhost ${filePath}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error displaying image: ${error}`);
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
        }
      });
    }
    
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
  if(ftServerProcess){
    const imgPath = req.body.img;
    let command;

    // Check if the path is a URL (starts with http:// or https://)
    if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
      command = `curl -s ${imgPath} | ./server/bin/send-image -g 64x64 -h localhost -`;
    } else {
      // It's a local file path
      const filePath = path.join(process.cwd(), imgPath.replace('/matrix-images/', 'matrix-images/'));
      command = `./server/bin/send-image -g 64x64 -h localhost ${filePath}`;
    }

    console.log(`Sending image with command: ${command}`);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return res.status(500).send('Failed to send image');
      }
      console.log(`stdout: ${stdout}`);
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      res.send('Image sent successfully');
    });
  } else {
    res.status(400).send('No LED Server running');
  }
});

// Test LED service endpoint
app.get('/api/testLEDService', (req, res) => {
  if (ftServerProcess) {
    res.json({ 
      status: 'running',
      message: 'LED service is running',
      details: `Process ID: ${ftServerProcess.pid}`
    });
  } else {
    res.json({ 
      status: 'stopped',
      message: 'LED service is stopped',
      details: 'No process running'
    });
  }
});

// Get all saved matrix images
app.get('/api/getMatrixImages', (req, res) => {
  try {
    const files = fs.readdirSync(matrixImagesDir);
    const images = files.map(file => {
      const filePath = path.join(matrixImagesDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        url: `/matrix-images/${file}`,
        created: stats.birthtime
      };
    });
    
    // Sort by creation date, newest first
    images.sort((a, b) => b.created - a.created);
    
    res.json({ success: true, images });
  } catch (error) {
    console.error('Error getting matrix images:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve the matrix-images directory statically
app.use('/matrix-images', express.static(matrixImagesDir));

// Cleanup on server shutdown
process.on('SIGTERM', () => {
  if (ftServerProcess) {
    process.kill(-ftServerProcess.pid);
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  if (ftServerProcess) {
    process.kill(-ftServerProcess.pid);
  }
  process.exit(0);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
