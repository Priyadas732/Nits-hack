import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="home-container">
      <div className="hero-section">
        <h1 className="hero-title">Student Credential Platform</h1>
        <p className="hero-subtitle">
          Issue, verify, and manage student credentials on the blockchain
        </p>
        
        <div className="features">
          <div className="feature-card">
            <h3>🎓 Issue Credentials</h3>
            <p>Upload and mint student degrees, certificates, and badges as NFTs</p>
          </div>
          
          <div className="feature-card">
            <h3>🔒 Secure & Immutable</h3>
            <p>All credentials are stored on IPFS and secured by blockchain technology</p>
          </div>
          
          <div className="feature-card">
            <h3>✅ Easy Verification</h3>
            <p>Verify credentials instantly using blockchain verification</p>
          </div>
        </div>
        
        <div className="cta-section">
          <Link to="/issue" className="cta-button">
            Issue New Credential
          </Link>
        </div>
      </div>
    </div>
  )
}

