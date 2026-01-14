import { createTorBoxClient, getTorboxApiKey } from '../lib/torbox';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testTorbox() {
    console.log('--- TorBox API Test ---');

    try {
        const apiKey = getTorboxApiKey();
        console.log('API Key found (starts with):', apiKey.substring(0, 5) + '...');

        const client = createTorBoxClient(apiKey);

        console.log('Validating API key...');
        const isValid = await client.validateApiKey();
        console.log('Is API key valid?', isValid);

        if (isValid) {
            console.log('Checking cache for a test hash...');
            const testHash = 'cb670c813bd16f40e79477005e709e056583fb46'; // Big Buck Bunny
            const cacheResults = await client.checkCache([testHash]);
            console.log('Cache results:', JSON.stringify(cacheResults, null, 2));
        }

    } catch (error) {
        console.error('Test failed:', error instanceof Error ? error.message : error);
    }
}

testTorbox();
