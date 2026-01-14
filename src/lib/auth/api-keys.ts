// ─────────────────────────────────────────────────────────────
// API Key Encryption (Cloudflare Workers Compatible)
// ─────────────────────────────────────────────────────────────
// Encrypts user API keys (e.g., TorBox) before storing in database.
// Uses AES-256-GCM for authenticated encryption via Web Crypto API.

const IV_LENGTH = 12; // GCM recommended IV length
const AUTH_TAG_LENGTH = 128; // bits

// ─────────────────────────────────────────────────────────────
// Helper: Convert between ArrayBuffer and hex strings
// ─────────────────────────────────────────────────────────────

function bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function hexToBuffer(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

// ─────────────────────────────────────────────────────────────
// Get Encryption Key (Web Crypto)
// ─────────────────────────────────────────────────────────────

let cachedKey: CryptoKey | null = null;

async function getEncryptionKey(): Promise<CryptoKey> {
    if (cachedKey) return cachedKey;

    const secret = process.env.API_KEY_ENCRYPTION_SECRET;

    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('FATAL: API_KEY_ENCRYPTION_SECRET is required in production!');
        }
        console.warn('⚠️  [Security] Using dev-only encryption key. Set API_KEY_ENCRYPTION_SECRET in production!');
    }

    const secretToUse = secret || 'dev-only-key-for-development-32ch';
    const encoder = new TextEncoder();

    // Import the secret as a key for PBKDF2
    const baseKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secretToUse),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    // Derive a 256-bit AES key
    cachedKey = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: encoder.encode('vela-salt'),
            iterations: 100000,
            hash: 'SHA-256',
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );

    return cachedKey;
}

// ─────────────────────────────────────────────────────────────
// Encrypt API Key
// ─────────────────────────────────────────────────────────────

export async function encryptApiKey(plainKey: string): Promise<string> {
    if (!plainKey) return '';

    const key = await getEncryptionKey();
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    const encrypted = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv,
            tagLength: AUTH_TAG_LENGTH,
        },
        key,
        encoder.encode(plainKey)
    );

    // Format: iv:encrypted (auth tag is appended to ciphertext in Web Crypto)
    return `${bufferToHex(iv)}:${bufferToHex(encrypted)}`;
}

// ─────────────────────────────────────────────────────────────
// Decrypt API Key
// ─────────────────────────────────────────────────────────────

export async function decryptApiKey(encryptedKey: string): Promise<string> {
    if (!encryptedKey) return '';

    const parts = encryptedKey.split(':');

    // Handle legacy unencrypted keys (no colons = plain text)
    // Also handle old 3-part format from Node.js crypto
    if (parts.length === 1) {
        console.warn('[Security] Found unencrypted API key. Consider re-encrypting.');
        return encryptedKey;
    }

    // Handle old 3-part Node.js format (iv:authTag:encrypted)
    // by converting to new 2-part format
    if (parts.length === 3) {
        console.warn('[Security] Found legacy encrypted format. Key may need re-encryption.');
        // Try to decrypt anyway - the old key won't work, so return empty
        // User will need to re-enter their API key
        return '';
    }

    if (parts.length !== 2) {
        console.warn('[Security] Invalid encrypted key format');
        return '';
    }

    const [ivHex, encryptedHex] = parts;

    try {
        const key = await getEncryptionKey();
        const iv = hexToBuffer(ivHex);
        const encryptedData = hexToBuffer(encryptedHex);

        const decrypted = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv,
                tagLength: AUTH_TAG_LENGTH,
            },
            key,
            encryptedData
        );

        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch (error) {
        console.error('[Security] Failed to decrypt API key:', error);
        throw new Error('Failed to decrypt API key. Key may be corrupted or encryption secret changed.');
    }
}

// ─────────────────────────────────────────────────────────────
// Check if Key is Encrypted
// ─────────────────────────────────────────────────────────────

export function isEncrypted(key: string): boolean {
    if (!key) return false;

    const parts = key.split(':');

    // New format: 2 parts (iv:encrypted)
    if (parts.length === 2) {
        // Check if first part looks like a hex IV (24 chars for 12 bytes)
        return /^[a-f0-9]{24}$/.test(parts[0]);
    }

    // Old format: 3 parts (iv:authTag:encrypted)
    if (parts.length === 3) {
        return /^[a-f0-9]{32}$/.test(parts[0]);
    }

    return false;
}

// ─────────────────────────────────────────────────────────────
// Migrate Unencrypted Key
// ─────────────────────────────────────────────────────────────

export async function migrateToEncrypted(key: string): Promise<string> {
    if (!key) return '';

    if (isEncrypted(key)) {
        return key; // Already encrypted
    }

    return encryptApiKey(key);
}
