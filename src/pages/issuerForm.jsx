import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { isAddress } from "viem";
import abi from "../utils/abi.json";
import { v4 as uuidv4 } from "uuid";
import { credentialAPI } from "../services/credentialAPI";

const CONTRACT_ADDRESS = "0x710ea2b142bF87FD6330d0880F93d23C496d4E48";
const CONTRACT_ABI = abi;

export default function IssuerForm() {
  const { isConnected } = useAccount();

  // State for file and form data
  const [file, setFile] = useState(null);
  const [certType, setCertType] = useState("Degree");
  const [status, setStatus] = useState("");
  const [finalHash, setFinalHash] = useState("");

  // State for UUID tracking
  const [credentialUUID, setCredentialUUID] = useState("");
  const [showUUIDCopied, setShowUUIDCopied] = useState(false);

  // State for student address
  const [studentAddress, setStudentAddress] = useState("");
  const [isAddressValid, setIsAddressValid] = useState(false);

  // Wagmi hooks for minting
  const {
    data: hash,
    error: mintError,
    isPending: isMintPending,
    writeContract,
  } = useWriteContract();

  // ---------- IPFS upload functions (main fix is here) ----------

  const getCleanJWT = () => {
    let jwt = import.meta.env.VITE_PINATA_JWT;
    if (!jwt) {
      throw new Error("VITE_PINATA_JWT is missing in .env file");
    }
    // Remove any surrounding quotes and whitespace
    return jwt.replace(/^['"]|['"]$/g, "").trim();
  };

  const uploadFileToIPFS = async (file) => {
    const jwt = getCleanJWT();

    try {
      const data = new FormData();
      data.append("file", file);

      const res = await fetch(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${jwt}`,
            // DON'T set Content-Type manually; fetch will add correct multipart boundary
          },
          body: data,
        }
      );

      const resText = await res.text();

      if (!res.ok) {
        // Pinata error body is JSON; try to parse, else show raw text
        try {
          const errJson = JSON.parse(resText);
          const details =
            errJson?.error?.details ||
            errJson?.error ||
            JSON.stringify(errJson);
          throw new Error(details);
        } catch {
          throw new Error(resText || "Unknown error from Pinata");
        }
      }

      const resJson = JSON.parse(resText);
      return resJson.IpfsHash;
    } catch (error) {
      console.error("FULL IPFS FILE ERROR:", error);
      throw new Error(
        `Failed to upload file to IPFS: ${
          error.message || "Unknown error occurred"
        }`
      );
    }
  };

  const uploadJSONToIPFS = async (jsonMetadata) => {
    const jwt = getCleanJWT();

    // Follow Pinata's required JSON shape
    const body = {
      pinataOptions: {
        cidVersion: 1,
      },
      pinataMetadata: {
        name: jsonMetadata.name || "credential-metadata.json",
      },
      pinataContent: jsonMetadata,
    };

    try {
      const res = await fetch(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify(body),
        }
      );

      const resText = await res.text();

      if (!res.ok) {
        try {
          const errJson = JSON.parse(resText);
          const details =
            errJson?.error?.details ||
            errJson?.error ||
            JSON.stringify(errJson);
          throw new Error(details);
        } catch {
          throw new Error(resText || "Unknown error from Pinata");
        }
      }

      const resJson = JSON.parse(resText);
      return resJson.IpfsHash;
    } catch (error) {
      console.error("FULL IPFS JSON ERROR:", error);
      throw new Error(
        `Failed to upload JSON to IPFS: ${
          error.message || "Unknown error occurred"
        }`
      );
    }
  };

  // ---------- Blockchain tx status ----------

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  // Register UUID after successful minting
  useEffect(() => {
    const registerUUID = async () => {
      if (isConfirmed && hash && !credentialUUID) {
        try {
          setStatus("Registering secure credential ID...");

          // Generate UUID
          const uuid = uuidv4();

          // Get estimated credential ID (in production, parse from event logs)
          const estimatedId = Date.now() % 1000000;

          // Register with backend
          await credentialAPI.registerCredential(
            uuid,
            estimatedId,
            studentAddress,
            hash
          );

          setCredentialUUID(uuid);
          setStatus("");

          console.log("✅ UUID Registered:", uuid);
          console.log(`🔗 Share link: http://localhost:5173/verify/${uuid}`);
        } catch (error) {
          console.error("UUID registration failed:", error);
          setStatus(
            "Warning: Credential minted but secure ID registration failed"
          );
        }
      }
    };

    registerUUID();
  }, [isConfirmed, hash, credentialUUID, studentAddress]);

  const handleAddressChange = (e) => {
    const address = e.target.value;
    setStudentAddress(address);
    setIsAddressValid(isAddress(address));
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a file");

    // Clear previous results
    setFinalHash("");
    setStatus("Uploading PDF to IPFS...");

    try {
      // STEP 1: Upload the PDF
      const fileHash = await uploadFileToIPFS(file);
      console.log("PDF uploaded. Hash:", fileHash);

      setStatus("Creating Metadata...");

      // STEP 2: Construct the Metadata JSON (your original structure)
      const metadata = {
        name: "Student Credential",
        description: `A ${certType} issued on the platform.`,
        certificateType: certType,
        image: `ipfs://${fileHash}`, // This links the PDF to the metadata
        attributes: [{ trait_type: "Type", value: certType }],
      };

      // STEP 3: Upload the Metadata
      const metaHash = await uploadJSONToIPFS(metadata);

      console.log("Final Metadata Hash:", metaHash);
      setFinalHash(metaHash);
      setStatus("");
    } catch (error) {
      console.error("Upload error:", error);
      setStatus("Error: " + error.message);
      setFinalHash("");
    }
  };

  // Handle minting to blockchain
  const handleMint = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first!");
      return;
    }

    if (!isAddressValid) {
      alert("Please enter a valid student wallet address!");
      return;
    }

    if (!finalHash) {
      alert("Please upload the credential to IPFS first!");
      return;
    }

    try {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "issueCredential",
        args: [studentAddress, finalHash],
      });
    } catch (error) {
      console.error("Minting error:", error);
    }
  };

  return (
    <div className="issuer-form-container">
      <div className="form-wrapper">
        <div className="form-header">
          <h1 className="form-title">Issue New Credential</h1>
          <p className="form-subtitle">
            Upload and mint student credentials as blockchain NFTs
          </p>
        </div>

        {/* Wallet Connection */}
        <div className="wallet-connect-section">
          <ConnectButton />
        </div>

        <div className="form-content">
          {/* File Input Section */}
          <div className="form-group">
            <label className="form-label">
              📄 Upload Credential Document (PDF)
            </label>
            <div className="file-input-wrapper">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files[0])}
                className="file-input"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="file-input-label">
                {file ? file.name : "Choose a file..."}
              </label>
            </div>
          </div>

          {/* Type Dropdown Section */}
          <div className="form-group">
            <label className="form-label">🎓 Credential Type</label>
            <select
              onChange={(e) => setCertType(e.target.value)}
              className="form-select"
              value={certType}
            >
              <option value="Degree">University Degree</option>
              <option value="Course_Certificate">Skill Certificate</option>
              <option value="Badge">Achievement Badge</option>
            </select>
          </div>

          {/* Action Button */}
          <button
            onClick={handleUpload}
            className="submit-button"
            disabled={!file}
          >
            🚀 Generate Hash & Upload to IPFS
          </button>

          {/* Status Message */}
          {status && (
            <div className="status-message">
              <p>{status}</p>
            </div>
          )}

          {/* Success Output */}
          {finalHash && (
            <div className="success-box">
              <div className="success-icon">✅</div>
              <h3>Success! Credential Ready</h3>
              <div className="hash-display">
                <p className="hash-label">IPFS Metadata Hash:</p>
                <code className="hash-value">{finalHash}</code>
                <p className="hash-note">
                  💡 Save this hash! This is what will be stored on the
                  blockchain.
                </p>
              </div>
            </div>
          )}

          {/* Blockchain Minting Section */}
          {finalHash && (
            <div className="mint-section">
              <h3 className="mint-section-title">Mint to Blockchain</h3>

              {/* Student Address Input */}
              <div className="form-group">
                <label className="form-label">👤 Student Wallet Address</label>
                <input
                  type="text"
                  value={studentAddress}
                  onChange={handleAddressChange}
                  placeholder="0x..."
                  className={`address-input ${
                    studentAddress && (isAddressValid ? "valid" : "invalid")
                  }`}
                />
                {studentAddress && !isAddressValid && (
                  <p className="error-text">Invalid Ethereum address format</p>
                )}
                {studentAddress && isAddressValid && (
                  <p className="success-text">✓ Valid address</p>
                )}
              </div>

              {/* Mint Button */}
              <button
                onClick={handleMint}
                disabled={
                  !isConnected ||
                  !isAddressValid ||
                  isMintPending ||
                  isConfirming
                }
                className="mint-button"
              >
                {isMintPending
                  ? "⏳ Waiting for Approval..."
                  : isConfirming
                  ? "⏳ Confirming Transaction..."
                  : "🔗 Mint Credential to Blockchain"}
              </button>

              {/* Connection Warning */}
              {!isConnected && (
                <p className="warning-text">
                  Please connect your wallet to mint credentials
                </p>
              )}

              {/* Mint Error */}
              {mintError && (
                <div className="error-box">
                  <p>
                    <strong>Transaction Error:</strong>
                  </p>
                  <p>{mintError.message || "Failed to mint credential"}</p>
                </div>
              )}

              {/* Transaction Hash */}
              {hash && (
                <div className="transaction-box">
                  <p className="tx-label">Transaction Hash:</p>
                  <code className="tx-hash">{hash}</code>
                  <a
                    href={`https://amoy.polygonscan.com/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="explorer-link"
                  >
                    View on PolygonScan →
                  </a>
                </div>
              )}

              {/* Success Confirmation */}
              {isConfirmed && (
                <div className="confirmed-box">
                  <div className="confirmed-icon">🎉</div>
                  <h4>Credential Minted Successfully!</h4>
                  <p>
                    The credential has been permanently recorded on the Polygon
                    Amoy blockchain.
                  </p>

                  {/* UUID Share Link */}
                  {credentialUUID && (
                    <div
                      style={{
                        marginTop: "1.5rem",
                        padding: "1rem",
                        background:
                          "linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))",
                        borderRadius: "8px",
                        border: "2px solid #667eea",
                      }}
                    >
                      <p
                        style={{
          )}
        </div>
      </div>
    </div>
  );
}
