import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Admin.css';

async function startLEDServer() {
  try {
    const response = await fetch('/api/startLEDServer');
    const result = await response.text();
    console.log(result);
  } catch (error) {
    console.error('Failed to start led server:', error);
  }
}

async function stopLEDServer() {
  try {
    const response = await fetch('api/stopLEDServer');
    const result = await response.text();
    console.log(result);
  } catch (error) {
    console.error('Failed to led server:', error);
  }
}

async function restartLEDServer() {
  try {
    const response = await fetch('/api/restartLEDServer');
    const result = await response.text();
    console.log(result);
  } catch (error) {
    console.error('Failed to restart LED server:', error);
  }
}

async function sendImage(url: string) {
  try {
    const response = await fetch('api/sendImage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({img: url}),
    })
    if (!response.ok) {
      console.error('send image failed')
    }
    const result = await response.text();
    console.log('Command output:', result);
  } catch (error) {
    console.error('Failed to execute command:', error);
  }
}

async function testLEDService() {
  try {
    const response = await fetch('/api/testLEDService');
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to test LED service:', error);
    throw error;
  }
}

interface Config {
  imageDisplayConfig: {
    cycleIntervalSeconds: number;
    lastDisplayedImage: string | null;
    isAutoCycling: boolean;
  };
}

interface Image {
  filename: string;
  path: string;
}

function Admin() {
  const [status, setStatus] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [ledServiceStatus, setLEDServiceStatus] = useState<string>('Loading...');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [cycleInterval, setCycleInterval] = useState<number>(30);

  useEffect(() => {
    // Fetch LED service status when component mounts
    handleTestLEDService();
    // Fetch config and images
    fetchConfig();
    fetchImages();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/config');
      const data = await response.json();
      setConfig(data);
      setCycleInterval(data.imageDisplayConfig.cycleIntervalSeconds);
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
  };

  const fetchImages = async () => {
    try {
      const response = await fetch('/api/images');
      const data = await response.json();
      setImages(data);
    } catch (error) {
      console.error('Failed to fetch images:', error);
    }
  };

  const handleUpdateInterval = async () => {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cycleIntervalSeconds: cycleInterval }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update interval');
      }

      const data = await response.json();
      setConfig(data.config);
      setStatus('Cycle interval updated successfully');
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      console.error('Failed to update interval:', error);
      setStatus('Failed to update cycle interval');
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handleStartCycle = async () => {
    try {
      const response = await fetch('/api/startCycle', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to start cycle');
      }

      await fetchConfig();
      setStatus('Image cycling started');
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      console.error('Failed to start cycle:', error);
      setStatus('Failed to start image cycling');
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handleStopCycle = async () => {
    try {
      const response = await fetch('/api/stopCycle', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to stop cycle');
      }

      await fetchConfig();
      setStatus('Image cycling stopped');
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      console.error('Failed to stop cycle:', error);
      setStatus('Failed to stop image cycling');
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handleAction = async (action: () => Promise<void>, message: string) => {
    setStatus(message);
    setErrorDetails(null);
    try {
      await action();
      // After any action, refresh the LED service status
      await handleTestLEDService();
      setStatus(null);
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
      setErrorDetails(error.details || null);
      setTimeout(() => {
        setStatus(null);
        setErrorDetails(null);
      }, 5000);
    }
  };

  const handleTestLEDService = async () => {
    try {
      const result = await testLEDService();
      setLEDServiceStatus(result.status);
      setStatus(result.message);
      setErrorDetails(result.details || null);
      setTimeout(() => {
        setStatus(null);
        setErrorDetails(null);
      }, 5000);
    } catch (error: any) {
      setLEDServiceStatus('error');
      setStatus('Failed to check LED service status');
      setErrorDetails(error.details || null);
      setTimeout(() => {
        setStatus(null);
        setErrorDetails(null);
      }, 5000);
    }
  };

  const handleImageSubmit = () => {
    if (imageUrl) {
      handleAction(() => sendImage(imageUrl), 'Sending image...');
    }
  };

  return (
    <div className="admin-container">
      <h1>Admin Controls</h1>
      <Link to="/" className="back-link">← Back to Canvas</Link>
      
      <div className="controls">
        <div className="control-group">
          <h2>LED Server Controls</h2>
          <div className="status-indicator">
            <span className={`status-dot ${ledServiceStatus.toLowerCase()}`}></span>
            <span>LED Service Status: {ledServiceStatus}</span>
          </div>
          <button onClick={handleTestLEDService}>Check LED Service Status</button>
          <button onClick={() => handleAction(startLEDServer, 'Starting LED server...')}>
            Start LED SERVER
          </button>
          <button onClick={() => handleAction(stopLEDServer, 'Stopping LED server...')}>
            Stop LED SERVER
          </button>
          <button onClick={() => handleAction(restartLEDServer, 'Restarting LED server...')}>
            Restart LED SERVER
          </button>
        </div>

        <div className="control-group">
          <h2>Image Cycling Controls</h2>
          <div className="cycle-controls">
            <div className="interval-setting">
              <label htmlFor="cycleInterval">Cycle Interval (seconds):</label>
              <input
                id="cycleInterval"
                type="number"
                min="1"
                value={cycleInterval}
                onChange={(e) => setCycleInterval(Number(e.target.value))}
              />
              <button onClick={handleUpdateInterval}>Update Interval</button>
            </div>
            <div className="cycle-status">
              <span>Status: {config?.imageDisplayConfig.isAutoCycling ? 'Running' : 'Stopped'}</span>
              <button onClick={handleStartCycle} disabled={config?.imageDisplayConfig.isAutoCycling}>
                Start Cycling
              </button>
              <button onClick={handleStopCycle} disabled={!config?.imageDisplayConfig.isAutoCycling}>
                Stop Cycling
              </button>
            </div>
          </div>
          <div className="image-list">
            <h3>Available Images ({images.length})</h3>
            <div className="image-grid">
              {images.map((image) => (
                <div key={image.filename} className="image-item">
                  <span>{image.filename}</span>
                  {config?.imageDisplayConfig.lastDisplayedImage === image.filename && (
                    <span className="last-displayed">(Last Displayed)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="control-group">
          <h2>Send Image</h2>
          <div className="image-input">
            <img src={imageUrl} alt="Preview"/>
            <input 
              type="text" 
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Enter image URL"
            />
            <button onClick={handleImageSubmit}>Send Image</button>
          </div>
        </div>
      </div>

      {status && <div className="status-message">{status}</div>}
      {errorDetails && (
        <div className="error-details">
          <pre>{errorDetails}</pre>
        </div>
      )}
    </div>
  );
}

export default Admin; 