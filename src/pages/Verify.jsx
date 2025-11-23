import { useState, useEffect } from 'react'
import { useReadContract } from 'wagmi'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import abi from '../utils/abi.json'

const CONTRACT_ADDRESS = "0x710ea2b142bF87FD6330d0880F93d23C496d4E48"

const Verify = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchId, setSearchId] = useState(id || '')
  const [metadata, setMetadata] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)

  const { data: credentialData, isError: isContractError, isLoading: isContractLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: abi,
    functionName: 'getCredential',
    args: searchId ? [BigInt(searchId)] : undefined,
    query: {
      enabled: false, // We'll trigger manually or via effect
    }
  })

  useEffect(() => {
    if (id) {
      setSearchId(id)
      handleSearch(id)
    }
  }, [id])

  const handleSearch = async (credentialId) => {
    if (!credentialId) return

    // If called from input change, update URL without reloading
    if (credentialId !== id) {
      navigate(`/verify/${credentialId}`, { replace: true })
    }

    setLoading(true)
    setMetadata(null)
    setFetchError(null)

    try {
      const result = await refetch()

      if (result.error) {
        // Contract reverted - credential doesn't exist
        setFetchError("Invalid Credential ID - This credential does not exist on the blockchain")
        setLoading(false)
        return
      }

      if (result.data) {
        // Check if ID exists (zero address means non-existent)
        if (result.data.student === '0x0000000000000000000000000000000000000000' || result.data.id === 0n) {
          setFetchError("Invalid Credential ID - This credential does not exist")
          setLoading(false)
          return
        }

        const ipfsHash = result.data.ipfsHash
        if (ipfsHash) {
          fetchMetadata(ipfsHash)
        } else {
          setFetchError("No IPFS hash found for this credential")
          setLoading(false)
        }
      }
    } catch (err) {
      console.error("Error fetching credential:", err)
      setFetchError("Invalid Credential ID - This credential does not exist")
      setLoading(false)
    }
  }

  const fetchMetadata = async (ipfsHash) => {
    try {
      const url = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
      const response = await axios.get(url)
      setMetadata(response.data)
    } catch (err) {
      console.error("IPFS Fetch Error:", err)
      setFetchError("Failed to load credential metadata from IPFS")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    handleSearch(searchId)
  }

  // Helper to format date
  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(Number(timestamp) * 1000)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="verify-container">
      <h1>Verify Credential</h1>
      <p>Enter the Credential ID to verify its authenticity on the Polygon Amoy testnet.</p>

      <form onSubmit={handleSubmit} className="search-form">
        <input
          type="number"
          placeholder="Enter Credential ID"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          className="search-input"
          min="1"
        />
        <button type="submit" disabled={loading || !searchId}>
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </form>

      {fetchError && (
        <div className="error-message">
          {fetchError}
        </div>
      )}

      {credentialData && credentialData.student !== '0x0000000000000000000000000000000000000000' && (
        <div className={`credential-card ${credentialData.revoked ? 'revoked' : 'valid'}`}>
          {credentialData.revoked && (
            <div className="status-badge revoked">REVOKED</div>
          )}
          {!credentialData.revoked && (
            <div className="status-badge valid">VALID</div>
          )}

          <div className="credential-details">
            {metadata ? (
              <>
                <h2>{metadata.studentName}</h2>
                <h3>{metadata.degreeName}</h3>
                <p><strong>Issuer:</strong> {metadata.issuerName}</p>
                <p><strong>Date Issued:</strong> {metadata.issueDate}</p>
                {/* Using metadata date or blockchain date? Blockchain date is trustless. */}
                <p className="blockchain-date">
                  <small>Blockchain Timestamp: {formatDate(credentialData.issueDate)}</small>
                </p>
              </>
            ) : (
              <p>Loading metadata...</p>
            )}

            <div className="credential-meta">
              <p><strong>Credential ID:</strong> {credentialData.id.toString()}</p>
              <p><strong>Student Address:</strong> <span className="address">{credentialData.student}</span></p>
              <p><strong>Issuer Address:</strong> <span className="address">{credentialData.issuer}</span></p>
            </div>

            {metadata && metadata.fileHash && ( // Assuming metadata might have fileHash or we use the ipfsHash from contract
              <a
                href={`https://gateway.pinata.cloud/ipfs/${metadata.fileHash || credentialData.ipfsHash}`} // Fallback logic might need adjustment based on actual metadata structure
                target="_blank"
                rel="noopener noreferrer"
                className="view-pdf-btn"
              >
                View Original PDF
              </a>
            )}
            {/* If metadata structure is different, we might just use the contract hash if that points to the PDF directly? 
                 The prompt says "upload a PDF to IPFS, create metadata". 
                 Usually metadata.json points to the PDF. 
                 Let's assume metadata has a field for the PDF or we just link the metadata hash if that's all we have?
                 Wait, "fetch the metadata JSON from IPFS using the returned hash". 
                 So the contract stores hash of metadata.json.
                 Metadata.json should contain the PDF hash/link.
                 Let's assume standard metadata structure or just a generic link.
             */}
          </div>
        </div>
      )}

      <style>{`
        .verify-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          text-align: center;
        }
        .search-form {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin: 2rem 0;
        }
        .search-input {
          padding: 0.8rem;
          border-radius: 8px;
          border: 1px solid #444;
          background: #1a1a1a;
          color: white;
          font-size: 1rem;
          width: 300px;
        }
        .credential-card {
          background: #1a1a1a;
          border-radius: 16px;
          padding: 2rem;
          margin-top: 2rem;
          position: relative;
          border: 1px solid #333;
          text-align: left;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
        .credential-card.valid {
          border-color: #4caf50;
        }
        .credential-card.revoked {
          border-color: #f44336;
        }
        .status-badge {
          position: absolute;
          top: 1rem;
          right: 1rem;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-weight: bold;
          font-size: 0.8rem;
        }
        .status-badge.valid {
          background: rgba(76, 175, 80, 0.2);
          color: #4caf50;
        }
        .status-badge.revoked {
          background: rgba(244, 67, 54, 0.2);
          color: #f44336;
        }
        .credential-details h2 {
          margin-top: 0;
          color: #646cff;
        }
        .credential-details h3 {
          margin-bottom: 1.5rem;
          color: #ccc;
        }
        .address {
          font-family: monospace;
          background: #333;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-size: 0.9rem;
        }
        .view-pdf-btn {
          display: inline-block;
          margin-top: 1.5rem;
          background: #646cff;
          color: white;
          padding: 0.8rem 1.5rem;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 500;
          transition: background 0.25s;
        }
        .view-pdf-btn:hover {
          background: #535bf2;
        }
        .error-message {
          color: #f44336;
          margin-top: 1rem;
          padding: 1rem;
          background: rgba(244, 67, 54, 0.1);
          border-radius: 8px;
        }
        .blockchain-date {
            color: #888;
            margin-top: 0.5rem;
        }
      `}</style>
    </div>
  )
}

export default Verify
