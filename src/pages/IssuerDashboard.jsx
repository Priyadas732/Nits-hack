import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract } from 'wagmi';
import { readContract } from 'wagmi/actions';
import { config } from '../config/wagmi';
import { fetchMetadata } from '../utils/ipfsHelper';
import CONTRACT_ABI from '../utils/abi.json';
import { Link } from 'react-router-dom';
import './IssuerDashboard.css';

const CREDENTIAL_REGISTRY_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

function IssuerDashboard() {
    const { address, isConnected } = useAccount();

    const [issuedCredentials, setIssuedCredentials] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [totalIssued, setTotalIssued] = useState(0);

    // Read the total credential count
    const { data: credentialCount } = useReadContract({
        address: CREDENTIAL_REGISTRY_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'credentialCount',
    });

    // Fetch credentials when wallet connects or count changes
    useEffect(() => {
        if (!isConnected || !address || !credentialCount) {
            setIssuedCredentials({});
            setTotalIssued(0);
            return;
        }

        fetchIssuedCredentials();
    }, [isConnected, address, credentialCount]);

    const fetchIssuedCredentials = async () => {
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

                    // Filter: only include if this credential was issued BY the current user
                    if (issuer.toLowerCase() === address.toLowerCase()) {
                        // Fetch metadata from IPFS to get certificate type and name
                        let metadata = null;
                        try {
                            metadata = await fetchMetadata(ipfsHash);
                        } catch (metadataError) {
                            console.error(`Failed to fetch metadata for credential ${i}:`, metadataError);
                        }

                        credentials.push({
                            id: Number(id),
                            student,
                            issuer,
                            ipfsHash,
                            timestamp: Number(issueDate),
                            isValid: !revoked,
                            metadata,
                            type: metadata?.certificateType || 'Uncategorized'
                        });
                    }
                } catch (credError) {
                    console.error(`Error fetching credential ${i}:`, credError);
                }
            }

            // Group by certificate type
            const grouped = credentials.reduce((acc, cred) => {
                const type = cred.type.replace(/_/g, ' '); // Format type string
                if (!acc[type]) {
                    acc[type] = [];
                }
                acc[type].push(cred);
                return acc;
            }, {});

            setIssuedCredentials(grouped);
            setTotalIssued(credentials.length);
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
            month: 'short',
            day: 'numeric',
        });
    };

    const formatAddress = (addr) => {
        return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
    };

    return (
        <div className="issuer-dashboard">
            <header className="dashboard-header">
                <h1>
                    🎓 Issuer Dashboard
                    {totalIssued > 0 && <span className="category-count">{totalIssued} Issued</span>}
                </h1>
                <ConnectButton />
            </header>

            <main className="dashboard-content">
                {!isConnected ? (
                    <div className="empty-state">
                        <p>Please connect your wallet to view issued credentials</p>
                    </div>
                ) : loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Fetching issued credentials from blockchain...</p>
                    </div>
                ) : error ? (
                    <div className="error-state">
                        <p>{error}</p>
                        <button className="retry-button" onClick={fetchIssuedCredentials}>Retry</button>
                    </div>
                ) : Object.keys(issuedCredentials).length === 0 ? (
                    <div className="empty-state">
                        <p>You haven't issued any credentials yet.</p>
                    </div>
                ) : (
                    <div className="categories-container">
                        {Object.entries(issuedCredentials).map(([type, creds]) => (
                            <div key={type} className="category-section">
                                <div className="category-title">
                                    {type}
                                    <span className="category-count">{creds.length}</span>
                                </div>
                                <div className="credentials-grid">
                                    {creds.map((cred) => (
                                        <div key={cred.id} className="compact-card">
                                            <div className="card-header">
                                                <h3 className="student-name">
                                                    {cred.metadata?.name || 'Unnamed Credential'}
                                                </h3>
                                                <span className={`status-indicator ${cred.isValid ? 'status-valid' : 'status-revoked'}`}>
                                                    {cred.isValid ? 'Valid' : 'Revoked'}
                                                </span>
                                            </div>

                                            <div className="card-body">
                                                <div className="info-row">
                                                    <span className="info-label">ID</span>
                                                    <span className="info-value credential-id">#{cred.id}</span>
                                                </div>
                                                <div className="info-row">
                                                    <span className="info-label">Issued</span>
                                                    <span className="info-value">{formatDate(cred.timestamp)}</span>
                                                </div>
                                                <div className="info-row">
                                                    <span className="info-label">Student</span>
                                                    <span className="info-value address-value" title={cred.student}>
                                                        {formatAddress(cred.student)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="card-footer">
                                                <Link to={`/verify/${cred.id}`} className="view-btn">
                                                    View Details →
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

export default IssuerDashboard;
