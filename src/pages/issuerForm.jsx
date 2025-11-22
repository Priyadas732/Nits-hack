import { useState } from 'react';
import { uploadFileToIPFS, uploadJSONToIPFS } from '../utils/pinata';

export default function IssuerForm() {
    const [file, setFile] = useState(null);
    const [certType, setCertType] = useState("Degree"); // Default option
    const [status, setStatus] = useState("");
    const [finalHash, setFinalHash] = useState("");

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

    return (
        <div className="issuer-form-container">
            <div className="form-wrapper">
                <div className="form-header">
                    <h1 className="form-title">Issue New Credential</h1>
                    <p className="form-subtitle">Upload and mint student credentials as blockchain NFTs</p>
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
                </div>
            </div>
        </div>
    );
}