import axios from 'axios';

const JWT = import.meta.env.VITE_PINATA_JWT; 

// Function 1: Upload the Physical File (PDF)
export const uploadFileToIPFS = async (file) => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const metadata = JSON.stringify({
            name: 'Student_Credential_File',
        });
        formData.append('pinataMetadata', metadata);

        const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
            headers: {
                'Authorization': `Bearer ${JWT}`,
                "Content-Type": "multipart/form-data"
            },
        });
        return res.data.IpfsHash; // This is the ID of the PDF
    } catch (error) {
        console.log("Error uploading file: ", error);
    }
};

// Function 2: Upload the JSON Data (The Certificate "Card")
export const uploadJSONToIPFS = async (body) => {
    try {
        const res = await axios.post("https://api.pinata.cloud/pinning/pinJSONToIPFS", body, {
            headers: {
                'Authorization': `Bearer ${JWT}`,
                "Content-Type": "application/json"
            },
        });
        return res.data.IpfsHash; // This is the ID of the Metadata
    } catch (error) {
        console.log("Error uploading JSON: ", error);
    }
};