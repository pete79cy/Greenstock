import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Encryption configuration
const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

// Generate or retrieve encryption key from environment
function getEncryptionKey(): string {
  const keyFromEnv = process.env.DOCUMENT_ENCRYPTION_KEY;
  
  if (keyFromEnv) {
    return keyFromEnv;
  }
  
  // Generate a new key if not provided
  const newKey = crypto.randomBytes(KEY_LENGTH).toString('hex');
  console.warn('WARNING: Generated new encryption key. Set DOCUMENT_ENCRYPTION_KEY environment variable for production.');
  console.log('Generated key (save this):', newKey);
  return newKey;
}

const ENCRYPTION_KEY = getEncryptionKey();

export interface EncryptedFileResult {
  encryptedFilePath: string;
  iv: string;
  originalSize: number;
}

/**
 * Encrypt a file and save it to disk
 */
export function encryptFile(inputBuffer: Buffer, outputPath: string): EncryptedFileResult {
  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Create cipher
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
  
  // Encrypt the file
  const encrypted = Buffer.concat([
    iv,
    cipher.update(inputBuffer),
    cipher.final()
  ]);
  
  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write encrypted file
  fs.writeFileSync(outputPath, encrypted);
  
  return {
    encryptedFilePath: outputPath,
    iv: iv.toString('hex'),
    originalSize: inputBuffer.length
  };
}

/**
 * Decrypt a file from disk
 */
export function decryptFile(encryptedFilePath: string): Buffer {
  if (!fs.existsSync(encryptedFilePath)) {
    throw new Error('Encrypted file not found');
  }
  
  // Read encrypted file
  const encryptedData = fs.readFileSync(encryptedFilePath);
  
  // Extract IV and encrypted content
  const iv = encryptedData.subarray(0, IV_LENGTH);
  const encrypted = encryptedData.subarray(IV_LENGTH);
  
  // Create decipher
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
  
  // Decrypt
  try {
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed - file may be corrupted or key is invalid');
  }
}

/**
 * Delete encrypted file securely
 */
export function secureDeleteFile(filePath: string): boolean {
  try {
    if (!fs.existsSync(filePath)) {
      return true;
    }
    
    // Get file size
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    
    // Overwrite with random data before deletion (basic secure delete)
    const randomData = crypto.randomBytes(fileSize);
    fs.writeFileSync(filePath, randomData);
    
    // Delete the file
    fs.unlinkSync(filePath);
    
    return true;
  } catch (error) {
    console.error('Secure delete failed:', error);
    return false;
  }
}

/**
 * Generate a secure filename for encrypted documents
 */
export function generateSecureFilename(originalName: string, employeePassport: string, documentType: string): string {
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(8).toString('hex');
  const extension = path.extname(originalName);
  
  // Create hash of sensitive info to avoid storing plaintext identifiers
  const hash = crypto.createHash('sha256')
    .update(`${employeePassport}_${documentType}_${timestamp}`)
    .digest('hex')
    .substring(0, 16);
  
  return `doc_${hash}_${randomSuffix}${extension}.enc`;
}

/**
 * Validate encryption key strength
 */
export function validateEncryptionSetup(): { isValid: boolean; message: string } {
  try {
    // Test encryption/decryption with sample data
    const testData = Buffer.from('test encryption data');
    const testPath = path.join(process.cwd(), 'temp_encryption_test.enc');
    
    const result = encryptFile(testData, testPath);
    const decrypted = decryptFile(testPath);
    
    // Cleanup test file
    fs.unlinkSync(testPath);
    
    if (testData.equals(decrypted)) {
      return { isValid: true, message: 'Encryption setup is valid' };
    } else {
      return { isValid: false, message: 'Encryption test failed - data mismatch' };
    }
  } catch (error) {
    return { isValid: false, message: `Encryption test failed: ${(error as Error).message}` };
  }
}