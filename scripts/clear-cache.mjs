import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

async function clearCache() {
    const url = process.env.DATABASE_URL || 'file:./data/watchers.db';
    const client = createClient({ url });

    try {
        console.log('Clearing stream_cache...');
        await client.execute('DELETE FROM stream_cache;');
        console.log('Successfully cleared stream_cache.');
    } catch (error) {
        console.error('Failed to clear stream_cache:', error);
    } finally {
        client.close();
    }
}

clearCache();
