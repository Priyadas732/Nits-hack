import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract } from 'wagmi';
import { readContract } from 'wagmi/actions';
import { config } from '../config/wagmi';
import { fetchMetadata } from '../utils/ipfsHelper';
import CONTRACT_ABI from '../utils/abi.json';
import PrivacyModal from '../components/PrivacyModal';
import './StudentDashboard.css';

const CREDENTIAL_REGISTRY_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

function StudentDashboard() {
    const { address, isConnected } = useAccount();

    const [myCredentials, setMyCredentials] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Read the total credential count
    const { data: credentialCount } = useReadContract({
        address: CREDENTIAL_REGISTRY_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'credentialCount',
    });

    // Fetch credentials when wallet connects or count changes
    useEffect(() => {
        if (!isConnected || !address || !credentialCount) {
            setMyCredentials([]);
            return;
        }

        fetchCredentials();
    }, [isConnected, address, credentialCount]);

    const fetchCredentials = async () => {
        setLoading(true);
        setError(null);
        const credentials = [];

        try {
            const count = Number(credentialCount);

            // Loop through all credentials (backwards from count to 1)
            for (let i = count; i >= 1; i--) {
                try {
                    // Fetch credential struct from contract
                    const credential = await readContract(config, {
                        address: CREDENTIAL_REGISTRY_ADDRESS,
                        abi: CONTRACT_ABI,
                        functionName: 'credentials',
                        args: [BigInt(i)],
                    });

                    // The actual contract struct order (from abi.json):
                    // [0] = id (uint256)
                    // [1] = ipfsHash (string)
                    // [2] = student (address)
                    // [3] = issuer (address)
                    // [4] = issueDate (uint256)
                    // [5] = revoked (bool)
                    const id = credential[0];
                    const ipfsHash = credential[1];
                    const student = credential[2];
                    const issuer = credential[3];
                    const issueDate = credential[4];
                    const revoked = credential[5];

                    // Filter: only include if this credential belongs to the current user and is NOT revoked
                    if (student.toLowerCase() === address.toLowerCase() && !revoked) {
                        // Fetch metadata from IPFS
                        try {
                            const metadata = await fetchMetadata(ipfsHash);

                            credentials.push({
                                id: Number(id),
                                student,
                                issuer,
                                ipfsHash,
                                timestamp: Number(issueDate),
                                isValid: !revoked,
                                metadata,
                            });
                        } catch (metadataError) {
                            console.error(`Failed to fetch metadata for credential ${i}:`, metadataError);
                            // Still add the credential even if metadata fails
                            credentials.push({
                                id: Number(id),
                                student,
                                issuer,
                                ipfsHash,
                                timestamp: Number(issueDate),
                                isValid: !revoked,
                                metadata: null,
                            });
                        }
                    }
                } catch (credError) {
                    console.error(`Error fetching credential ${i}:`, credError);
                }
            }

            setMyCredentials(credentials);
        } catch (err) {
            console.error('Error fetching credentials:', err);
            setError('Failed to load credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div className="student-dashboard">
            <header className="dashboard-header">
                <h1>My Credentials</h1>
                <ConnectButton />
            </header>

            <main className="dashboard-content">
                {!isConnected ? (
                    <div className="connect-prompt">
                        <p>Please connect your wallet to view your credentials</p>
                    </div>
                ) : loading ? (
                    <div className="loading">
                        <p>Loading your credentials...</p>
                    </div>
                ) : error ? (
                    <div className="error">
                        <p>{error}</p>
                        <button onClick={fetchCredentials}>Retry</button>
                    </div>
                ) : myCredentials.length === 0 ? (
                    <div className="empty-state">
                        <p>You don't have any credentials yet.</p>
                    </div>
                ) : (
                    <div className="credentials-grid">
                        {myCredentials.map((cred) => (
                            <CredentialCard key={cred.id} credential={cred} formatDate={formatDate} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

function CredentialCard({ credential, formatDate }) {
    const { metadata, timestamp, ipfsHash } = credential;
    const [pdfUrl, setPdfUrl] = useState(null);
    const [loadingPdf, setLoadingPdf] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // Fetch PDF when component mounts if metadata.image exists
    useEffect(() => {
        const loadPDF = async () => {
            if (metadata?.image) {
                setLoadingPdf(true);
                try {
                    const { fetchPDFBlob } = await import('../utils/ipfsHelper');
                    const url = await fetchPDFBlob(metadata.image);
                    setPdfUrl(url);
                } catch (error) {
                    console.error('Error loading PDF:', error);
                } finally {
                    setLoadingPdf(false);
                }
            }
        };

        loadPDF();

        // Cleanup blob URL when component unmounts
        return () => {
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [metadata?.image]);

    return (
        <>
            <div className="credential-card">
                {metadata?.image && (
                    <div className="credential-pdf-preview">
                        {loadingPdf ? (
                            <div className="pdf-loading">Loading PDF...</div>
                        ) : pdfUrl ? (
                            <iframe
                                src={pdfUrl}
                                title={metadata.name || 'Credential PDF'}
                                className="pdf-iframe"
                            />
                        ) : (
                            <div className="pdf-error">Failed to load PDF</div>
                        )}
                    </div>
                )}

                <div className="credential-info">
                    <h3 className="credential-name">
                        {metadata?.name || 'Unnamed Credential'}
                    </h3>

                    <p className="credential-date">
                        <strong>Issued:</strong> {formatDate(timestamp)}
                    </p>

                    {metadata?.description && (
                        <p className="credential-description">{metadata.description}</p>
                    )}

                    {metadata?.attributes && metadata.attributes.length > 0 && (
                        <div className="credential-attributes">
                            <h4>Attributes:</h4>
                            <ul>
                                {metadata.attributes.map((attr, index) => (
                                    <li key={index}>
                                        <strong>{attr.trait_type || attr.key}:</strong> {attr.value}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="credential-hash">
                        <small>IPFS: {ipfsHash.substring(0, 20)}...</small>
                    </div>

                    {/* Share Button */}
                    <button
                        className="share-button"
                        onClick={() => setShowModal(true)}
                    >
                        🔗 Share Credential
                    </button>
                </div>
            </div>

            {/* Privacy Modal */}
            {showModal && (
                <PrivacyModal
                    credential={credential}
                    onClose={() => setShowModal(false)}
                />
            )}
        </>
    );
}

export default StudentDashboard;
