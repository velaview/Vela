import dotenv from 'dotenv';
import fs from 'fs';

// Load env
if (fs.existsSync('.env.local')) {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const TORBOX_API = 'https://api.torbox.app/v1/api';
const API_KEY = process.env.TORBOX_API_KEY;

async function testDirectPlay() {
    if (!API_KEY) {
        console.error('No API Key');
        return;
    }

    console.log('Testing Direct Play Link Generation...');

    try {
        // 1. Get user's torrent list (mocking finding a torrent)
        const listRes = await fetch(`${TORBOX_API}/torrents/mylist`, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });
        const listData = await listRes.json();

        if (!listData.success || !listData.data || listData.data.length === 0) {
            console.log('No torrents found in library to test.');
            return;
        }

        // Pick the first available torrent
        const torrent = listData.data[0];
        console.log(`\nSelected Torrent: ${torrent.name} (ID: ${torrent.id})`);

        // 2. Get Files
        const filesRes = await fetch(`${TORBOX_API}/torrents/mylist?id=${torrent.id}`, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });
        const filesData = await filesRes.json();
        const files = filesData.data.files || [];

        console.log(`Found ${files.length} files.`);

        // 3. Find largest video file
        const videoFiles = files.filter((f: any) => {
            const ext = f.name.split('.').pop()?.toLowerCase();
            return ['mp4', 'mkv', 'avi', 'webm', 'mov'].includes(ext);
        }).sort((a: any, b: any) => b.size - a.size);

        if (videoFiles.length === 0) {
            console.log('No video files found.');
            return;
        }

        const targetFile = videoFiles[0];
        const extension = targetFile.name.split('.').pop()?.toLowerCase();
        console.log(`Target File: ${targetFile.name} (ID: ${targetFile.id})`);
        console.log(`Extension: ${extension} (${extension === 'mp4' ? 'Direct Play Compatible' : 'Needs Transcoding/HLS'})`);

        // 4. Request Direct Download Link
        console.log('\nRequesting Direct Link...');
        const dlUrl = `${TORBOX_API}/torrents/requestdl?token=${API_KEY}&torrent_id=${torrent.id}&file_id=${targetFile.id}&zip_link=false`;

        const dlRes = await fetch(dlUrl);
        const dlData = await dlRes.json();

        if (dlData.success && dlData.data) {
            console.log('✅ Direct Link Generated!');
            console.log(`URL: ${dlData.data}`);

            // Check headers to confirm
            console.log('\nVerifying Link Headers...');
            const headRes = await fetch(dlData.data, { method: 'HEAD' });
            console.log(`Status: ${headRes.status}`);
            console.log(`Content-Type: ${headRes.headers.get('content-type')}`);
            console.log(`Content-Length: ${headRes.headers.get('content-length')}`);
        } else {
            console.error('❌ Failed to generate link:', dlData);
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

testDirectPlay();
