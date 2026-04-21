/**
 * Generate JWT RSA key pair and write to .env
 * Usage: npx tsx scripts/generate-jwt-keys.ts
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../.env');

function generateBase64KeyPair(): { publicKeyBase64: string; privateKeyBase64: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  return {
    publicKeyBase64: Buffer.from(publicKey).toString('base64'),
    privateKeyBase64: Buffer.from(privateKey).toString('base64'),
  };
}

// Read existing .env
let existingContent = '';
if (fs.existsSync(envPath)) {
  existingContent = fs.readFileSync(envPath, 'utf8');
}

const keys = generateBase64KeyPair();

// Build new entries
const privateKeyEntry = `JWT_PRIVATE_KEY=${keys.privateKeyBase64}`;
const publicKeyEntry = `JWT_PUBLIC_KEY=${keys.publicKeyBase64}`;

// Check if keys already exist, update or append
const hasPrivateKey = existingContent.includes('JWT_PRIVATE_KEY=');
const hasPublicKey = existingContent.includes('JWT_PUBLIC_KEY=');

if (hasPrivateKey) {
  existingContent = existingContent.replace(/JWT_PRIVATE_KEY=.*/g, privateKeyEntry);
} else {
  existingContent += `\n${privateKeyEntry}`;
}

if (hasPublicKey) {
  existingContent = existingContent.replace(/JWT_PUBLIC_KEY=.*/g, publicKeyEntry);
} else {
  existingContent += `\n${publicKeyEntry}`;
}

fs.writeFileSync(envPath, existingContent, 'utf8');

console.log('✅ JWT keys generated and written to .env');
console.log(`   JWT_PRIVATE_KEY: ${keys.privateKeyBase64.slice(0, 40)}...`);
console.log(`   JWT_PUBLIC_KEY:  ${keys.publicKeyBase64.slice(0, 40)}...`);
