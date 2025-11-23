import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import './App.css'
import IssuerForm from './pages/issuerForm.jsx'
import Home from './pages/Home.jsx'
import CertificateTypes from './pages/CertificateTypes.jsx'

function App() {
  return (
    <Router>
      <div className="app-container">
        <nav className="navbar">
          <div className="nav-content">
            <h2 className="nav-title">Student Credentials</h2>
            <div className="nav-links">
              <Link to="/" className="nav-link">Home</Link>
              <Link to="/issue" className="nav-link">Issue Credential</Link>
              <Link to="/types" className="nav-link">Manage Types</Link>
            </div>
          </div>
        </nav>
        
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/issue" element={<IssuerForm />} />
          <Route path="/types" element={<CertificateTypes />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
