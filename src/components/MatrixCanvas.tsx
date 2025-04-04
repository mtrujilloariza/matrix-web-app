import { useRef, useState, useEffect } from 'react';
import { useDrag } from '@use-gesture/react';
import './MatrixCanvas.css';

interface MatrixCanvasProps {
  width?: number;
  height?: number;
  pixelSize?: number;
}

const MatrixCanvas: React.FC<MatrixCanvasProps> = ({
  width = 64,
  height = 64,
  pixelSize: initialPixelSize = 8,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#FFFFFF');
  const [status, setStatus] = useState<string | null>(null);
  const [artistName, setArtistName] = useState('');
  const [artworkName, setArtworkName] = useState('');
  const [pixelSize, setPixelSize] = useState(initialPixelSize);

  // Calculate responsive pixel size
  useEffect(() => {
    const updateCanvasSize = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = window.innerHeight * 0.6; // Use 60% of viewport height
      
      // Calculate the pixel size that would fit the container
      const horizontalPixelSize = Math.floor(containerWidth / width);
      const verticalPixelSize = Math.floor(containerHeight / height);
      
      // Use the smaller of the two to ensure the canvas fits
      const newPixelSize = Math.max(1, Math.min(horizontalPixelSize, verticalPixelSize));
      
      setPixelSize(newPixelSize);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [width, height]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width * pixelSize;
    canvas.height = height * pixelSize;

    // Fill with black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid with darker lines for better visibility on black
    ctx.strokeStyle = '#333333';
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

  const drawPixel = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / pixelSize);
    const y = Math.floor((clientY - rect.top) / pixelSize);

    if (x >= 0 && x < width && y >= 0 && y < height) {
      ctx.fillStyle = color;
      ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    }
  };

  // Mouse and touch event handling
  const bind = useDrag(({ event, active, first, xy: [x, y] }) => {
    event.preventDefault();
    if (first) setIsDrawing(true);
    if (active && isDrawing) {
      drawPixel(x, y);
    }
    if (!active) setIsDrawing(false);
  });

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill with black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Redraw grid with darker lines
    ctx.strokeStyle = '#333333';
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
    <div className="matrix-canvas-container" ref={containerRef}>
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
        <div className="color-picker-container">
          <label htmlFor="colorPicker">Pen Color</label>
          <div className="color-picker-wrapper">
            <input
              id="colorPicker"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
        </div>
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
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          {...bind()}
          style={{
            border: '1px solid #000',
            cursor: 'crosshair',
            touchAction: 'none',
            maxWidth: '100%',
            height: 'auto'
          }}
        />
      </div>
    </div>
  );
};

export default MatrixCanvas; 