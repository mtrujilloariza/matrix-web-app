import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css'
import MatrixCanvas from './components/MatrixCanvas';
import Admin from './components/Admin';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <>
            <h1>Draw Marlon something :)</h1>
            <MatrixCanvas />
          </>
        } />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  )
}

export default App
