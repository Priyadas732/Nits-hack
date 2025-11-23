import React, { useState } from 'react';
import './PrivacyModal.css';

function PrivacyModal({ credential, onClose }) {
    const [isPrivate, setIsPrivate] = useState(true);
    const [selectedFields, setSelectedFields] = useState(() => {
        // Initialize with all fields selected
        if (credential?.metadata?.attributes) {
            return credential.metadata.attributes.map(attr => attr.trait_type || attr.key);
        }
        return [];
    });
    const [linkGenerated, setLinkGenerated] = useState(false);

    const handleToggleField = (fieldName) => {
        setSelectedFields(prev => {
            if (prev.includes(fieldName)) {
                return prev.filter(f => f !== fieldName);
            } else {
                return [...prev, fieldName];
            }
        });
    };

    const handleGenerateLink = () => {
        let shareableUrl;

        if (isPrivate) {
            // Private mode: encode selected fields
            const rulesData = selectedFields;
            const base64Rules = btoa(JSON.stringify(rulesData));
            shareableUrl = `${window.location.origin}/verify/${credential.id}?rules=${base64Rules}`;
        } else {
            // Public mode: no rules parameter
            shareableUrl = `${window.location.origin}/verify/${credential.id}`;
        }

        // Copy to clipboard
        navigator.clipboard.writeText(shareableUrl).then(() => {
            setLinkGenerated(true);
            alert('✅ Shareable link copied to clipboard!\n\n' + shareableUrl);
        }).catch(err => {
            console.error('Failed to copy to clipboard:', err);
            alert('Failed to copy link. Please copy manually:\n\n' + shareableUrl);
        });
    };

    const attributes = credential?.metadata?.attributes || [];

    return (
        <div className="privacy-modal-overlay" onClick={onClose}>
            <div className="privacy-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Share Credential</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {/* Public/Private Toggle */}
                    <div className="sharing-mode-toggle">
                        <label className="toggle-label">
                            <span className="toggle-text">
                                {isPrivate ? '🔒 Private Sharing' : '🌐 Public Sharing'}
                            </span>
                            <div className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={!isPrivate}
                                    onChange={() => setIsPrivate(!isPrivate)}
                                />
                                <span className="slider"></span>
                            </div>
                        </label>
                    </div>

                    {/* Description */}
                    <div className="sharing-description">
                        {isPrivate ? (
                            <p>Select which attributes to share. Only checked fields will be visible to the viewer. PDF of certificate won't be shared.</p>
                        ) : (
                            <p>All credential details will be publicly visible to anyone with the link.</p>
                        )}
                    </div>

                    {/* Attribute Selection (only for private mode) */}
                    {isPrivate && attributes.length > 0 && (
                        <div className="attributes-selection">
                            <h3>Select Attributes to Share:</h3>
                            <div className="checkbox-list">
                                {attributes.map((attr, index) => {
                                    const fieldName = attr.trait_type || attr.key;
                                    const isChecked = selectedFields.includes(fieldName);

                                    return (
                                        <label key={index} className="checkbox-item">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleToggleField(fieldName)}
                                            />
                                            <span className="checkbox-label">
                                                <strong>{fieldName}:</strong> {attr.value}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Warning for no fields selected */}
                    {isPrivate && selectedFields.length === 0 && (
                        <div className="warning-message">
                            ⚠️ No attributes selected. The viewer will only see basic credential info.
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="cancel-button" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="generate-button"
                        onClick={handleGenerateLink}
                    >
                        {linkGenerated ? '✓ Link Copied!' : '🔗 Generate Shareable Link'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PrivacyModal;
