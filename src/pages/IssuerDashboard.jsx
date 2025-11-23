import React, { useState, useEffect } from 'react';
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

    // Read the total credential count
    const { data: credentialCount } = useReadContract({
        address: CREDENTIAL_REGISTRY_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'credentialCount',
    });

    useEffect(() => {
        if (!isConnected || !address || !credentialCount) {
            setIssuedCredentials({});
            return;
        }
        fetchIssuedCredentials();
    }, [isConnected, address, credentialCount]);

    const fetchIssuedCredentials = async () => {
        setLoading(true);
        setError(null);
        const groupedCredentials = {};

        try {
            const count = Number(credentialCount);

            // Iterate backwards to get latest first
            for (let i = count; i >= 1; i--) {
                try {
                    const credential = await readContract(config, {
                        address: CREDENTIAL_REGISTRY_ADDRESS,
                        abi: CONTRACT_ABI,
                        functionName: 'credentials',
                        args: [BigInt(i)],
                    });

                    const issuer = credential[3];

                    // Filter: only include if issued by current user
                    if (issuer.toLowerCase() === address.toLowerCase()) {
                        const id = credential[0];
                        const ipfsHash = credential[1];
                        const student = credential[2];
                        const issueDate = credential[4];
                        const revoked = credential[5];

                        let metadata = null;
                        try {
                            metadata = await fetchMetadata(ipfsHash);
                        } catch (err) {
                            console.warn(`Failed to fetch metadata for credential ${id}`, err);
                        }

                        const type = metadata?.certificateType?.replace(/_/g, ' ') || 'Unknown Type';

                        if (!groupedCredentials[type]) {
                            groupedCredentials[type] = [];
                        }

                        groupedCredentials[type].push({
                            id: Number(id),
                            student,
                            timestamp: Number(issueDate),
                            revoked,
                            metadata
                        });
                    }
                } catch (err) {
                    console.error(`Error fetching credential ${i}:`, err);
                }
            }
            setIssuedCredentials(groupedCredentials);
        } catch (err) {
            console.error("Error fetching credentials:", err);
            setError("Failed to load issued credentials.");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp) => {
        return new Date(timestamp * 1000).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatAddress = (addr) => {
        return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
    };

    if (!isConnected) {
        return (
            <div className="issuer-dashboard-container">
                <div className="connect-wallet-message">
                    <h2>Please connect your wallet to view your issued credentials.</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="issuer-dashboard-container">
            <header className="dashboard-header">
                <h1>Issuer Dashboard</h1>
                <p>Manage and view all credentials you have issued</p>
            </header>

            {loading && (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Fetching issued credentials...</p>
                </div>
            )}

            {error && <div className="error-message">{error}</div>}

            {!loading && Object.keys(issuedCredentials).length === 0 && (
                <div className="empty-state">
                    <p>You haven't issued any credentials yet.</p>
                </div>
            )}

            {!loading && Object.entries(issuedCredentials).map(([type, credentials]) => (
                <div key={type} className="credential-group">
                    <h2 className="group-title">{type} <span className="count-badge">{credentials.length}</span></h2>
                    <div className="credential-list">
                        {credentials.map((cred) => (
                            <div key={cred.id} className={`credential-tile ${cred.revoked ? 'revoked' : ''}`}>
                                <div className="tile-content">
                                    <div className="tile-header">
                                        <span className="credential-id">#{cred.id}</span>
                                        <span className="credential-date">{formatDate(cred.timestamp)}</span>
                                    </div>
                                    <div className="tile-body">
                                        <div className="student-info">
                                            <span className="label">Student:</span>
                                            <span className="value" title={cred.student}>{formatAddress(cred.student)}</span>
                                        </div>
                                        {cred.revoked && <span className="revoked-badge">REVOKED</span>}
                                    </div>
                                </div>
                                <Link to={`/verify/${cred.id}`} className="view-link" target="_blank">
                                    View ↗
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default IssuerDashboard;
