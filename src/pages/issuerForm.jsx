import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { isAddress } from 'viem';
import abi from '../utils/abi.json';

const CONTRACT_ADDRESS = "0x710ea2b142bF87FD6330d0880F93d23C496d4E48";
const CONTRACT_ABI = abi;

export default function IssuerForm() {
    const { isConnected } = useAccount();

    // State for file and form data
    const [file, setFile] = useState(null);
    const [certType, setCertType] = useState("Degree");
    const [status, setStatus] = useState("");
    const [finalHash, setFinalHash] = useState("");

    // State for student address
    const [studentAddress, setStudentAddress] = useState("");
    const [isAddressValid, setIsAddressValid] = useState(false);

    // Wagmi hooks for minting
    const { data: hash, error: mintError, isPending: isMintPending, writeContract } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    // IPFS Upload Functions
    const uploadFileToIPFS = async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
                'pinata_api_key': import.meta.env.VITE_PINATA_API_KEY,
                'pinata_secret_api_key': import.meta.env.VITE_PINATA_SECRET_KEY,
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Failed to upload file to IPFS');
        }

        const data = await response.json();
        return data.IpfsHash;
    };

    const uploadJSONToIPFS = async (jsonMetadata) => {
        const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'pinata_api_key': import.meta.env.VITE_PINATA_API_KEY,
                'pinata_secret_api_key': import.meta.env.VITE_PINATA_SECRET_KEY,
            },
            body: JSON.stringify(jsonMetadata),
        });

        if (!response.ok) {
            throw new Error('Failed to upload JSON to IPFS');
        }

        const data = await response.json();
        return data.IpfsHash;
    };

    // Handle address validation
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

            // STEP 2: Construct the Metadata JSON
            const metadata = {
                name: "Student Credential",
                description: `A ${certType} issued on the platform.`,
                certificateType: certType,
                image: `ipfs://${fileHash}`, // This links the PDF to the metadata
                attributes: [
                    { trait_type: "Type", value: certType }
                ]
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
                functionName: 'issueCredential',
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
                    <p className="form-subtitle">Upload and mint student credentials as blockchain NFTs</p>
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
                                {file ? file.name : 'Choose a file...'}
                            </label>
                        </div>
                    </div>

                    {/* Type Dropdown Section */}
                    <div className="form-group">
                        <label className="form-label">
                            🎓 Credential Type
                        </label>
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
                                <p className="hash-note">💡 Save this hash! This is what will be stored on the blockchain.</p>
                            </div>
                        </div>
                    )}

                    {/* Blockchain Minting Section */}
                    {finalHash && (
                        <div className="mint-section">
                            <h3 className="mint-section-title">Mint to Blockchain</h3>

                            {/* Student Address Input */}
                            <div className="form-group">
                                <label className="form-label">
                                    👤 Student Wallet Address
                                </label>
                                <input
                                    type="text"
                                    value={studentAddress}
                                    onChange={handleAddressChange}
                                    placeholder="0x..."
                                    className={`address-input ${studentAddress && (isAddressValid ? 'valid' : 'invalid')}`}
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
                                disabled={!isConnected || !isAddressValid || isMintPending || isConfirming}
                                className="mint-button"
                            >
                                {isMintPending ? '⏳ Waiting for Approval...' :
                                    isConfirming ? '⏳ Confirming Transaction...' :
                                        '🔗 Mint Credential to Blockchain'}
                            </button>

                            {/* Connection Warning */}
                            {!isConnected && (
                                <p className="warning-text">Please connect your wallet to mint credentials</p>
                            )}

                            {/* Mint Error */}
                            {mintError && (
                                <div className="error-box">
                                    <p><strong>Transaction Error:</strong></p>
                                    <p>{mintError.message || 'Failed to mint credential'}</p>
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
                                    <p>The credential has been permanently recorded on the Polygon Amoy blockchain.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}