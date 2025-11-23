import fs from 'fs';
import path from 'path';

// Read .env file
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const jwtMatch = envContent.match(/VITE_PINATA_JWT=(.*)/);

if (!jwtMatch) {
    console.error("❌ VITE_PINATA_JWT not found in .env");
    process.exit(1);
}

let jwt = jwtMatch[1].trim();
jwt = jwt.replace(/^['"]|['"]$/g, '').trim();

console.log("--- JWT Analysis ---");
console.log(`Token: ${jwt}`);

const parts = jwt.split('.');
if (parts.length !== 3) {
    console.error("❌ Invalid JWT format (not 3 parts)");
    process.exit(1);
}

const payload = parts[1];
console.log(`\nPayload (Base64Url): ${payload}`);

try {
    const decodedPayload = Buffer.from(payload, 'base64').toString('utf-8');
    console.log(`\nDecoded Payload: ${decodedPayload}`);
    
    // Try parsing as JSON
    JSON.parse(decodedPayload);
    console.log("\n✅ Payload is valid JSON");
} catch (e) {
    console.error("\n❌ Payload is NOT valid JSON:", e.message);
}

