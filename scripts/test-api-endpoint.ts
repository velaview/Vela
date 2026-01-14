
async function test() {
    try {
        console.log('Testing One Punch Man (kitsu:10740)...');
        const start = Date.now();
        const res = await fetch('http://localhost:3000/api/test-streams/streams?id=kitsu:10740&type=series&method=6');
        console.log(`Status: ${res.status} (${Date.now() - start}ms)`);
        const text = await res.text();
        console.log('Body:', text.substring(0, 500) + '...');
    } catch (e) {
        console.error(e);
    }
}
test();
