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
  const canvasStateRef = useRef<ImageData | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [artistName, setArtistName] = useState('');
  const [artworkName, setArtworkName] = useState('');
  const [pixelSize, setPixelSize] = useState(initialPixelSize);
  const [message, setMessage] = useState('');

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
      
      // Save the current canvas state before resizing
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvasStateRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
      }
      
      setPixelSize(newPixelSize);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [width, height]);

  // Initialize canvas and restore state if available
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Disable image smoothing
    ctx.imageSmoothingEnabled = false;

    // Set canvas size
    canvas.width = width * pixelSize;
    canvas.height = height * pixelSize;

    // Fill with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid with lighter lines
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

    // Restore previous canvas state if available
    if (canvasStateRef.current) {
      // Create a temporary canvas to scale the saved state
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasStateRef.current.width;
      tempCanvas.height = canvasStateRef.current.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.putImageData(canvasStateRef.current, 0, 0);
        
        // Draw the scaled image back to the main canvas
        ctx.drawImage(
          tempCanvas,
          0, 0, tempCanvas.width, tempCanvas.height,
          0, 0, canvas.width, canvas.height
        );
      }
    }
  }, [width, height, pixelSize]);

  const drawPixel = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Disable image smoothing to maintain crisp pixels
    ctx.imageSmoothingEnabled = false;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / pixelSize);
    const y = Math.floor((clientY - rect.top) / pixelSize);

    if (x >= 0 && x < width && y >= 0 && y < height) {
      // Draw with selected color
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

    // Fill with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Redraw grid with lighter lines
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

  const handleSave = async () => {
    if (!canvasRef.current) return;
    
    try {
      // Create a temporary canvas for pixel-perfect saving
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width; // Use original matrix dimensions
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (!tempCtx) return;
      
      // Disable image smoothing
      tempCtx.imageSmoothingEnabled = false;
      
      // Fill with white background
      tempCtx.fillStyle = '#FFFFFF';
      tempCtx.fillRect(0, 0, width, height);
      
      // Copy each pixel from the display canvas to the save canvas
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // For each cell in the matrix
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          // Get the color of the center of each cell
          const pixelData = ctx.getImageData(
            x * pixelSize + pixelSize / 2,
            y * pixelSize + pixelSize / 2,
            1, 1
          ).data;
          
          // If the pixel is not white (background), copy it
          if (!(pixelData[0] === 255 && pixelData[1] === 255 && pixelData[2] === 255)) {
            tempCtx.fillStyle = `rgb(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]})`;
            tempCtx.fillRect(x, y, 1, 1);
          }
        }
      }
      
      const imageData = tempCanvas.toDataURL('image/png');
      
      const response = await fetch('/api/saveMatrixImage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          imageData,
          artistName: artistName.trim(),
          artworkName: artworkName.trim()
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage('Image saved successfully!');
        // Clear the canvas after successful save
        clearCanvas();
        // Clear the form fields
        setArtistName('');
        setArtworkName('');
      } else {
        setMessage('Failed to save image. Please try again.');
      }
    } catch (error) {
      console.error('Error saving image:', error);
      setMessage('Error saving image. Please try again.');
    }

    // Clear the message after 3 seconds
    setTimeout(() => setMessage(''), 3000);
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
          onClick={handleSave}
          disabled={!artistName.trim() || !artworkName.trim()}
          className={!artistName.trim() || !artworkName.trim() ? 'disabled' : ''}
        >
          Save
        </button>
      </div>
      {message && <div className="status-message">{message}</div>}
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