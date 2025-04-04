import { useRef, useState, useEffect } from 'react';
import './MatrixCanvas.css';

interface MatrixCanvasProps {
  width?: number;
  height?: number;
  pixelSize?: number;
}

const MatrixCanvas: React.FC<MatrixCanvasProps> = ({
  width = 64,
  height = 64,
  pixelSize = 8,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [status, setStatus] = useState<string | null>(null);
  const [artistName, setArtistName] = useState('');
  const [artworkName, setArtworkName] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width * pixelSize;
    canvas.height = height * pixelSize;

    // Fill with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= width; i++) {
      ctx.beginPath();
      ctx.moveTo(i * pixelSize, 0);
      ctx.lineTo(i * pixelSize, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i <= height; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * pixelSize);
      ctx.lineTo(canvas.width, i * pixelSize);
      ctx.stroke();
    }
  }, [width, height, pixelSize]);

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / pixelSize);
    const y = Math.floor((e.clientY - rect.top) / pixelSize);

    if (x >= 0 && x < width && y >= 0 && y < height) {
      ctx.fillStyle = color;
      ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Redraw grid
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= width; i++) {
      ctx.beginPath();
      ctx.moveTo(i * pixelSize, 0);
      ctx.lineTo(i * pixelSize, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i <= height; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * pixelSize);
      ctx.lineTo(canvas.width, i * pixelSize);
      ctx.stroke();
    }
  };

  const saveImage = async () => {
    if (!artistName.trim() || !artworkName.trim()) {
      setStatus('Please enter both your name and artwork name');
      setTimeout(() => setStatus(null), 3000);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setStatus('Saving...');
    try {
      const response = await fetch('/api/saveMatrixImage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: canvas.toDataURL('image/png'),
          artistName: artistName.trim(),
          artworkName: artworkName.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setStatus(`Image saved as ${result.filename}`);
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      console.error('Error saving image:', error);
      setStatus('Failed to save image. Please try again.');
      setTimeout(() => setStatus(null), 3000);
    }
  };

  return (
    <div className="matrix-canvas-container">
      <div className="artist-info">
        <div className="input-group">
          <label htmlFor="artistName">Your Name:</label>
          <input
            id="artistName"
            type="text"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            placeholder="Enter your name"
          />
        </div>
        <div className="input-group">
          <label htmlFor="artworkName">Artwork Name:</label>
          <input
            id="artworkName"
            type="text"
            value={artworkName}
            onChange={(e) => setArtworkName(e.target.value)}
            placeholder="Enter artwork name"
          />
        </div>
      </div>
      <div className="controls">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <button onClick={clearCanvas}>Clear</button>
        <button 
          onClick={saveImage}
          disabled={!artistName.trim() || !artworkName.trim()}
          className={!artistName.trim() || !artworkName.trim() ? 'disabled' : ''}
        >
          Save
        </button>
      </div>
      {status && <div className="status-message">{status}</div>}
      <canvas
        ref={canvasRef}
        onMouseDown={() => setIsDrawing(true)}
        onMouseUp={() => setIsDrawing(false)}
        onMouseMove={draw}
        onMouseLeave={() => setIsDrawing(false)}
        style={{
          border: '1px solid #000',
          cursor: 'crosshair',
        }}
      />
    </div>
  );
};

export default MatrixCanvas; 