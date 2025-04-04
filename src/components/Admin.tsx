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

function Admin() {
  const [status, setStatus] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');

  const handleAction = async (action: () => Promise<void>, message: string) => {
    setStatus(message);
    try {
      await action();
      setStatus(null);
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
      setTimeout(() => setStatus(null), 3000);
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