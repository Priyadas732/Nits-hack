import { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import abi from "../utils/abi.json";
import { credentialAPI } from "../services/credentialAPI";
import "../Verify.css";

const CONTRACT_ADDRESS = "0xC8e4689704E74e62C59D7Fc20C74f7D0803157e9";

const Verify = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [searchId, setSearchId] = useState(id || "");
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isUUIDLookup, setIsUUIDLookup] = useState(false);
  const [actualCredentialId, setActualCredentialId] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [searched, setSearched] = useState(false);
  const [privacyRules, setPrivacyRules] = useState(null);

  // Parse privacy rules from URL
  useEffect(() => {
    const rulesParam = searchParams.get('rules');
    if (rulesParam) {
      try {
        // Decode Base64 and parse JSON
        const decodedRules = JSON.parse(atob(rulesParam));
        setPrivacyRules(decodedRules);
        console.log('Privacy rules applied:', decodedRules);
      } catch (error) {
        console.error('Failed to parse privacy rules:', error);
        setPrivacyRules(null);
      }
    } else {
      setPrivacyRules(null);
    }
  }, [searchParams]);

  // Check if ID is a UUID and lookup actual credential ID
  useEffect(() => {
    const lookupCredentialId = async () => {
      if (!searchId) return;

      // Check if it's a UUID format (contains hyphens)
      const isUUID = searchId.includes("-");
      setIsUUIDLookup(isUUID);

      if (isUUID) {
        setLoading(true);
        setFetchError(null);
        try {
          const result = await credentialAPI.getCredentialByUUID(searchId);
          if (result) {
            setActualCredentialId(result.credentialId);
          } else {
            setFetchError("Credential not found. Invalid verification link.");
          }
        } catch (error) {
          console.error("UUID lookup failed:", error);
          setFetchError("Failed to verify credential. Please try again.");
        } finally {
          setLoading(false);
        }
      } else {
        // Use as direct ID (number)
        setActualCredentialId(parseInt(searchId));
      }
    };

    lookupCredentialId();
  }, [searchId]);
  const {
    data: credentialData,
    isError: isContractError,
    isLoading: isContractLoading,
    refetch,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: abi,
    functionName: "getCredential",
    args: actualCredentialId ? [BigInt(actualCredentialId)] : undefined,
    query: {
      enabled: !!actualCredentialId,
    },
  });

  // Auto-trigger verification when URL contains an ID
  useEffect(() => {
    if (id) {
      setSearchId(id);
      setSearched(true); // Auto-trigger search for URL-based access
    }
  }, [id]);

  // Trigger blockchain fetch when actualCredentialId is ready
  useEffect(() => {
    if (actualCredentialId && searched) {
      fetchFromBlockchain();
    }
  }, [actualCredentialId, searched]);

  const fetchFromBlockchain = async () => {
    setLoading(true);
    setMetadata(null);

    try {
      const result = await refetch();

      if (result.error) {
        setFetchError(
          "Invalid Credential ID - This credential does not exist on the blockchain"
        );
        setLoading(false);
        return;
      }

      if (result.data) {
        if (
          result.data.student ===
          "0x0000000000000000000000000000000000000000" ||
          result.data.id === 0n
        ) {
          setFetchError(
            "Invalid Credential ID - This credential does not exist"
          );
          setLoading(false);
          return;
        }

        const ipfsHash = result.data.ipfsHash;
        if (ipfsHash) {
          fetchMetadata(ipfsHash);
        } else {
          setFetchError("No IPFS hash found for this credential");
          setLoading(false);
        }
      }
    } catch (err) {
      console.error("Error fetching credential:", err);
      setFetchError("Invalid Credential ID - This credential does not exist");
      setLoading(false);
    }
  };

  const handleSearch = async (credentialId) => {
    if (!credentialId) return;

    if (credentialId !== id) {
      navigate(`/verify/${credentialId}`, { replace: true });
    }

    setFetchError(null);
    setSearched(true);

    // The UUID lookup useEffect will handle setting actualCredentialId
    // and then the fetchFromBlockchain useEffect will trigger
  };

  const fetchMetadata = async (ipfsHash) => {
    try {
      const url = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      const response = await axios.get(url);
      setMetadata(response.data);
    } catch (err) {
      console.error("IPFS Fetch Error:", err);
      setFetchError("Failed to load credential metadata from IPFS");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch(searchId);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatAddress = (address) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  // Extract PDF hash from metadata.image (format: "ipfs://hash")
  const getPdfHash = () => {
    if (!metadata || !metadata.image) return null;
    return metadata.image.replace("ipfs://", "");
  };

  // Filter metadata based on privacy rules
  const getFilteredMetadata = () => {
    if (!metadata) return null;

    // If no privacy rules, return full metadata
    if (!privacyRules || privacyRules.length === 0) {
      return metadata;
    }

    // Create a filtered copy of metadata
    // Remove attributes completely so they can't be inspected
    const filtered = { ...metadata };

    if (metadata.attributes && Array.isArray(metadata.attributes)) {
      filtered.attributes = metadata.attributes.filter(attr => {
        const fieldName = attr.trait_type || attr.key;
        return privacyRules.includes(fieldName);
      });
    }

    return filtered;
  };

  // Check if PDF should be accessible
  const isPdfAccessible = () => {
    // PDF is not accessible if privacy rules are applied
    return !privacyRules || privacyRules.length === 0;
  };

  return (
    <div className="verify-page">
      <div className="verify-container">
        {/* Header */}
        <div className="verify-header">
          <h1 className="verify-title">Verify Credential</h1>
          <p className="verify-subtitle">
            Enter a Credential ID to verify its authenticity on the Polygon Amoy
            blockchain
          </p>
        </div>

        {/* Search Section */}
        <div className="search-section">
          <form onSubmit={handleSubmit} className="search-form">
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="Enter Credential ID or UUID..."
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="search-input"
              />
              <button
                type="submit"
                disabled={loading || !searchId}
                className="search-button"
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Verifying...
                  </>
                ) : (
                  <>🔍 Verify Credential</>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Error Message */}
        {fetchError && searched && (
          <div className="error-card">
            <div className="error-icon">❌</div>
            <h3>Credential Not Found</h3>
            <p>{fetchError}</p>
            <div className="error-suggestions">
              <p>
                <strong>Suggestions:</strong>
              </p>
              <ul>
                <li>Double-check the Credential ID</li>
                <li>Ensure the credential was successfully minted</li>
                <li>Try a different ID</li>
              </ul>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="loading-card">
            <div className="loading-spinner"></div>
            <p>Fetching credential from blockchain...</p>
          </div>
        )}

        {/* Credential Card */}
        {credentialData &&
          credentialData.student !==
          "0x0000000000000000000000000000000000000000" &&
          !loading && (
            <div
              className={`credential-card ${credentialData.revoked ? "revoked" : "valid"
                }`}
            >
              {/* Status Badge */}
              <div
                className={`status-badge ${credentialData.revoked ? "revoked" : "valid"
                  }`}
              >
                {credentialData.revoked ? "⛔ REVOKED" : "✓ VALID"}
              </div>

              {/* Credential Header */}
              <div className="credential-header">
                <div className="credential-icon">🎓</div>
                <div className="credential-title-section">
                  <h2 className="credential-main-title">
                    {metadata
                      ? metadata.certificateType?.replace("_", " ") ||
                      "Credential"
                      : "Loading..."}
                  </h2>
                  <p className="credential-id-display">
                    Credential ID: #{credentialData.id.toString()}
                  </p>
                </div>
              </div>

              {/* Credential Details Grid */}
              <div className="credential-details-grid">
                {/* Certificate Type */}
                {metadata && (
                  <div className="detail-item">
                    <div className="detail-label">Certificate Type</div>
                    <div className="detail-value">
                      {metadata.certificateType?.replace("_", " ") || "N/A"}
                    </div>
                  </div>
                )}

                {/* Issue Date */}
                <div className="detail-item">
                  <div className="detail-label">Issue Date</div>
                  <div className="detail-value">
                    {formatDate(credentialData.issueDate)}
                  </div>
                </div>

                {/* Student Address */}
                <div className="detail-item full-width">
                  <div className="detail-label">Student Address</div>
                  <div className="detail-value address-value">
                    <span className="address-full">
                      {credentialData.student}
                    </span>
                    <span className="address-short">
                      {formatAddress(credentialData.student)}
                    </span>
                    <button
                      className="copy-btn"
                      onClick={() => copyToClipboard(credentialData.student)}
                      title="Copy address"
                    >
                      📋
                    </button>
                  </div>
                </div>

                {/* Issuer Address */}
                <div className="detail-item full-width">
                  <div className="detail-label">Issuer Address</div>
                  <div className="detail-value address-value">
                    <span className="address-full">
                      {credentialData.issuer}
                    </span>
                    <span className="address-short">
                      {formatAddress(credentialData.issuer)}
                    </span>
                    <button
                      className="copy-btn"
                      onClick={() => copyToClipboard(credentialData.issuer)}
                      title="Copy address"
                    >
                      📋
                    </button>
                  </div>
                </div>
              </div>

              {/* Attributes Section - Only if metadata exists and has attributes */}
              {metadata && getFilteredMetadata()?.attributes && getFilteredMetadata().attributes.length > 0 && (
                <div className="attributes-section">
                  <h3 className="section-title">Credential Attributes</h3>
                  <div className="attributes-grid">
                    {getFilteredMetadata().attributes.map((attr, index) => (
                      <div key={index} className="attribute-card">
                        <div className="attribute-label">{attr.trait_type || attr.key}</div>
                        <div className="attribute-value">{attr.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="action-buttons">
                {/* Only show PDF button if rules don't exist - don't even load PDF info */}
                {!privacyRules && metadata && getPdfHash() && (
                  <a
                    href={`https://gateway.pinata.cloud/ipfs/${getPdfHash()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="action-btn primary"
                  >
                    View Original Document
                  </a>
                )}

                {/* Show restricted message if rules exist */}
                {privacyRules && (
                  <div className="action-btn disabled-info">
                    <span className="lock-icon">🔒</span>
                    <div>
                      <strong>Document Access Restricted</strong>
                      <p>Original PDF not available in privacy mode</p>
                    </div>
                  </div>
                )}

                <a
                  href={`https://amoy.polygonscan.com/address/${CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-btn secondary"
                >
                  View on PolygonScan
                </a>
              </div>

              {/* Privacy Notice */}
              {privacyRules && privacyRules.length > 0 && (
                <div className="privacy-notice">
                  <span className="privacy-icon">🔒</span>
                  <div>
                    <strong>Limited Visibility Mode</strong>
                    <p>This credential has been shared with restricted access. Only selected attributes are visible.</p>
                  </div>
                </div>
              )}

              {/* Metadata Info */}
              {metadata && (
                <div className="metadata-section">
                  <details className="metadata-details">
                    <summary>📊 View Complete Metadata</summary>
                    <pre className="metadata-json">
                      {JSON.stringify(getFilteredMetadata(), null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )}

        {/* Empty State */}
        {!searched && !loading && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>Ready to Verify</h3>
            <p>
              Enter a Credential ID above to verify a student credential on the
              blockchain
            </p>
            <div className="example-text">
              <strong>Example:</strong> Try entering credential ID:{" "}
              <code>6</code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Verify;
