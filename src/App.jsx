import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import "./App.css";
import IssuerForm from "./pages/issuerForm.jsx";
import Home from "./pages/Home.jsx";
import Verify from "./pages/Verify.jsx";
import CertificateTypes from "./pages/CertificateTypes.jsx";
import RegisterIssuer from "./pages/RegisterIssuer.jsx";
import StudentDashboard from './pages/StudentDashboard.jsx'


function App() {
  return (
    <Router>
      <div className="app-container">
        <nav className="navbar">
          <div className="nav-content">
            <h2 className="nav-title">Student Credentials</h2>
            <div className="nav-links">
              <Link to="/" className="nav-link">
                Home
              </Link>
              <Link to="/register" className="nav-link">
                Register Issuer
              </Link>
              <Link to="/issue" className="nav-link">
                Issue Credential
              </Link>
              <Link to="/verify" className="nav-link">
                Verify Credential
              </Link>
              <Link to="/types" className="nav-link">
                Manage Types
              </Link>
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<RegisterIssuer />} />
          <Route path="/dashboard" element={<StudentDashboard />} />
          <Route path="/issue" element={<IssuerForm />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/verify/:id" element={<Verify />} />
          <Route path="/types" element={<CertificateTypes />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
