import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Admin.css';

interface SavedImage {
  name: string;
  url: string;
  created: string;
}

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

async function fetchSavedImages(): Promise<SavedImage[]> {
  try {
    const response = await fetch('/api/getMatrixImages');
    const data = await response.json();
    return data.success ? data.images : [];
  } catch (error) {
    console.error('Failed to fetch saved images:', error);
    return [];
  }
}

function Admin() {
  const [status, setStatus] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [ledServiceStatus, setLEDServiceStatus] = useState<string>('Loading...');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [savedImages, setSavedImages] = useState<SavedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<SavedImage | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Fetch LED service status and saved images when component mounts
    handleTestLEDService();
    loadSavedImages();
  }, []);

  const loadSavedImages = async () => {
    const images = await fetchSavedImages();
    setSavedImages(images);
  };

  const handleImageSelect = async (image: SavedImage) => {
    setSelectedImage(image);
    try {
      const response = await fetch('/api/sendImage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ img: image.url }),
      });
      
      if (response.ok) {
        setMessage('Image sent to display');
      } else {
        setMessage('Failed to send image to display');
      }
    } catch (error) {
      console.error('Error sending image:', error);
      setMessage('Error sending image to display');
    }
    
    setTimeout(() => setMessage(''), 3000);
  };

  const handleAction = async (action: () => Promise<void>, message: string) => {
    setStatus(message);
    setErrorDetails(null);
    try {
      await action();
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
          <h2>Saved Images</h2>
          <div className="saved-images-grid">
            {savedImages.map((image) => (
              <div 
                key={image.name}
                className={`saved-image ${selectedImage?.name === image.name ? 'selected' : ''}`}
                onClick={() => handleImageSelect(image)}
              >
                <img src={image.url} alt={image.name} />
                <span className="image-name">{image.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="control-group">
          <h2>Send External Image</h2>
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