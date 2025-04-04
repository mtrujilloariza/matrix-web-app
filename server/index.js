import express from 'express';
import { exec, spawn } from 'child_process';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';

const app = express();
let ftServerProcess = null;
let imageInterval = null;

// Function to read config
const readConfig = () => {
  try {
    const configPath = path.join(process.cwd(), 'server', 'config.json');
    if (!fs.existsSync(configPath)) {
      const defaultConfig = {
        imageDisplayConfig: {
          cycleIntervalSeconds: 30,
          lastDisplayedImage: null,
          isAutoCycling: false
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      return defaultConfig;
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    console.error('Error reading config:', error);
    return null;
  }
};

// Function to save config
const saveConfig = (config) => {
  try {
    const configPath = path.join(process.cwd(), 'server', 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
};

// Function to get all images
const getImages = () => {
  const imageDir = path.join(process.cwd(), 'matrix-images');
  if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir);
    return [];
  }
  return fs.readdirSync(imageDir)
    .filter(file => file.endsWith('.png'))
    .map(file => ({
      filename: file,
      path: path.join(imageDir, file)
    }));
};

// Function to display image
const displayImage = (imagePath) => {
  if (!ftServerProcess) return false;
  
  try {
    exec(`./server/bin/send-image -g 64x64 -h localhost ${imagePath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error displaying image: ${error}`);
        return;
      }
      if (stderr) {
        console.error(`Image display warning: ${stderr}`);
      }
      console.log(`Image displayed: ${imagePath}`);
    });
    return true;
  } catch (error) {
    console.error('Error displaying image:', error);
    return false;
  }
};

// Function to start image cycling
const startImageCycle = () => {
  // Clear any existing interval
  stopImageCycle();

  const config = readConfig();
  if (!config) return false;

  const images = getImages();
  if (images.length === 0) {
    console.log('No images found to cycle through');
    return false;
  }

  let currentIndex = 0;
  
  // Find the last displayed image index
  if (config.imageDisplayConfig.lastDisplayedImage) {
    const lastIndex = images.findIndex(img => img.filename === config.imageDisplayConfig.lastDisplayedImage);
    if (lastIndex !== -1) {
      currentIndex = (lastIndex + 1) % images.length;
    }
  }

  // Display first image immediately
  if (displayImage(images[currentIndex].path)) {
    // Save the current image to config
    config.imageDisplayConfig.lastDisplayedImage = images[currentIndex].filename;
    saveConfig(config);

    // Set up interval for cycling
    imageInterval = setInterval(() => {
      const currentImages = getImages(); // Get fresh list of images
      if (currentImages.length === 0) {
        stopImageCycle();
        return;
      }
      currentIndex = (currentIndex + 1) % currentImages.length;
      if (displayImage(currentImages[currentIndex].path)) {
        config.imageDisplayConfig.lastDisplayedImage = currentImages[currentIndex].filename;
        saveConfig(config);
      }
    }, config.imageDisplayConfig.cycleIntervalSeconds * 1000);

    return true;
  }
  return false;
};

// Function to stop image cycling
const stopImageCycle = () => {
  if (imageInterval) {
    clearInterval(imageInterval);
    imageInterval = null;
  }
};

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
      // Stop image cycling if LED server exits
      stopImageCycle();
    });

    console.log('LED server started successfully');
    return true;
  } catch (error) {
    console.error('Error starting LED server:', error);
    return false;
  }
};

// Cleanup function
const cleanup = () => {
  stopImageCycle();
  if (ftServerProcess) {
    process.kill(-ftServerProcess.pid);
    ftServerProcess = null;
  }
};

// Start ft-server and image cycle on server start if it was running before
const config = readConfig();
if (config) {
  if (startFtServer() && config.imageDisplayConfig.isAutoCycling) {
    setTimeout(() => {
      startImageCycle();
    }, 2000); // Give the LED server time to start
  }
}

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

// Add new endpoints
app.get('/api/config', (req, res) => {
  const config = readConfig();
  if (!config) {
    res.status(500).json({ error: 'Failed to read config' });
    return;
  }
  res.json(config);
});

app.post('/api/config', (req, res) => {
  const { cycleIntervalSeconds } = req.body;
  const config = readConfig();
  
  if (!config) {
    res.status(500).json({ error: 'Failed to read config' });
    return;
  }

  config.imageDisplayConfig.cycleIntervalSeconds = cycleIntervalSeconds;
  
  if (saveConfig(config)) {
    // Restart cycling if it's active
    if (imageInterval) {
      stopImageCycle();
      startImageCycle();
    }
    res.json({ success: true, config });
  } else {
    res.status(500).json({ error: 'Failed to save config' });
  }
});

app.get('/api/images', (req, res) => {
  res.json(getImages());
});

app.post('/api/startCycle', (req, res) => {
  const config = readConfig();
  if (!config) {
    res.status(500).json({ error: 'Failed to read config' });
    return;
  }

  config.imageDisplayConfig.isAutoCycling = true;
  saveConfig(config);

  if (startImageCycle()) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to start image cycle' });
  }
});

app.post('/api/stopCycle', (req, res) => {
  const config = readConfig();
  if (!config) {
    res.status(500).json({ error: 'Failed to read config' });
    return;
  }

  config.imageDisplayConfig.isAutoCycling = false;
  saveConfig(config);

  stopImageCycle();
  res.json({ success: true });
});

// Cleanup on server shutdown
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
