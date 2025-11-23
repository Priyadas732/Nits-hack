import { useState, useEffect } from 'react';

export default function CertificateTypes() {
    const [types, setTypes] = useState([]);
    const [newTypeName, setNewTypeName] = useState("");
    const [newTypeFields, setNewTypeFields] = useState([{ name: "", type: "text" }]);
    const [showAddForm, setShowAddForm] = useState(false);

    // Load types from localStorage on mount
    useEffect(() => {
        const savedTypes = localStorage.getItem('certTemplates');
        const templateVersion = localStorage.getItem('templateVersion');
        
        // Define the latest defaults
        const defaults = [
            { 
                id: 1, 
                name: "University Degree", 
                fields: [
                    { name: "Issuing Authority Name", type: "text" },
                    { name: "Course", type: "text" },
                    { name: "Major", type: "text" },
                    { name: "GPA", type: "number" },
                    { name: "Completion Date", type: "date" }
                ] 
            },
            { 
                id: 2, 
                name: "Skill Certificate", 
                fields: [
                    { name: "Skill Name", type: "text" },
                    { name: "Level", type: "text" },
                    { name: "Hours", type: "number" }
                ] 
            }
        ];
        
        // If no data exists or version is outdated, reset to defaults
        if (!savedTypes || templateVersion !== '1.1') {
            setTypes(defaults);
            localStorage.setItem('certTemplates', JSON.stringify(defaults));
            localStorage.setItem('templateVersion', '1.1');
        } else {
            setTypes(JSON.parse(savedTypes));
        }
    }, []);

    const handleAddField = () => {
        setNewTypeFields([...newTypeFields, { name: "", type: "text" }]);
    };

    const handleFieldChange = (index, key, value) => {
        const updatedFields = [...newTypeFields];
        updatedFields[index][key] = value;
        setNewTypeFields(updatedFields);
    };

    const handleRemoveField = (index) => {
        const updatedFields = newTypeFields.filter((_, i) => i !== index);
        setNewTypeFields(updatedFields);
    };

    const handleSaveType = () => {
        if (!newTypeName.trim()) return alert("Please enter a type name");
        if (newTypeFields.some(f => !f.name.trim())) return alert("All fields must have a name");

        const newType = {
            id: Date.now(),
            name: newTypeName,
            fields: newTypeFields
        };

        const updatedTypes = [...types, newType];
        setTypes(updatedTypes);
        localStorage.setItem('certTemplates', JSON.stringify(updatedTypes));
        
        // Reset form
        setNewTypeName("");
        setNewTypeFields([{ name: "", type: "text" }]);
        setShowAddForm(false);
    };

    const handleDeleteType = (id) => {
        if (window.confirm("Are you sure you want to delete this certificate type?")) {
            const updatedTypes = types.filter(t => t.id !== id);
            setTypes(updatedTypes);
            localStorage.setItem('certTemplates', JSON.stringify(updatedTypes));
        }
    };

    return (
        <div className="certificate-types-container">
            <div className="form-wrapper">
                <div className="form-header">
                    <h1 className="form-title">Certificate Types</h1>
                    <p className="form-subtitle">Manage your credential templates and schema</p>
                </div>

                <div className="form-content">
                    {!showAddForm ? (
                        <div className="types-list-view">
                            <button 
                                onClick={() => setShowAddForm(true)}
                                className="add-type-button"
                            >
                                + Create New Certificate Type
                            </button>

                            <div className="types-grid">
                                {types.map(type => (
                                    <div key={type.id} className="type-card">
                                        <div className="type-card-header">
                                            <h3>{type.name}</h3>
                                            <button 
                                                onClick={() => handleDeleteType(type.id)}
                                                className="delete-icon"
                                                title="Delete Type"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                        <div className="type-fields">
                                            <p className="fields-label">Defined Fields:</p>
                                            <ul>
                                                {type.fields.map((field, idx) => (
                                                    <li key={idx}>
                                                        <span className="field-name">{field.name}</span>
                                                        <span className="field-type">({field.type})</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="add-type-form">
                            <div className="form-group">
                                <label className="form-label">Certificate Type Name</label>
                                <input 
                                    type="text" 
                                    value={newTypeName}
                                    onChange={(e) => setNewTypeName(e.target.value)}
                                    placeholder="e.g., Internship Certificate"
                                    className="text-input"
                                />
                            </div>

                            <div className="fields-section">
                                <label className="form-label">Custom Attributes</label>
                                {newTypeFields.map((field, index) => (
                                    <div key={index} className="field-row">
                                        <input 
                                            type="text" 
                                            value={field.name}
                                            onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                                            placeholder="Field Name (e.g. GPA)"
                                            className="field-input"
                                        />
                                        <select 
                                            value={field.type}
                                            onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
                                            className="field-select"
                                        >
                                            <option value="text">Text</option>
                                            <option value="number">Number</option>
                                            <option value="date">Date</option>
                                        </select>
                                        <button 
                                            onClick={() => handleRemoveField(index)}
                                            className="remove-field-btn"
                                            disabled={newTypeFields.length === 1}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                                <button onClick={handleAddField} className="add-field-btn">
                                    + Add Attribute
                                </button>
                            </div>

                            <div className="form-actions">
                                <button 
                                    onClick={() => setShowAddForm(false)}
                                    className="cancel-button"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSaveType}
                                    className="save-button"
                                >
                                    Save Template
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

