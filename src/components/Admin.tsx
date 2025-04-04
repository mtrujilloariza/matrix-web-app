import { useState } from 'react';
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

function Admin() {
  const [status, setStatus] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [ledServiceStatus, setLEDServiceStatus] = useState<string>('Unknown');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const handleAction = async (action: () => Promise<void>, message: string) => {
    setStatus(message);
    setErrorDetails(null);
    try {
      await action();
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
          {errorDetails && (
            <div className="error-details">
              <pre>{errorDetails}</pre>
            </div>
          )}
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
    </div>
  );
}

export default Admin; 