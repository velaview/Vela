/**
 * Addon Connectivity Tester
 * 
 * This script tests the anime catalog addon to diagnose why it returns empty data.
 * Run with: npx tsx src/scripts/addon-tester.ts
 */

const ADDON_BASE_URL = 'https://1fe84bc728af-stremio-anime-catalogs.baby-beamup.club';

// The full configured URL with all catalogs enabled
const ADDON_CONFIG = {
    cinemeta: 'on',
    search: 'on',
    'myanimelist_top-all-time': 'on',
    'myanimelist_top-airing': 'on',
    'myanimelist_top-series': 'on',
    'myanimelist_top-movies': 'on',
    'myanimelist_popular': 'on',
    'myanimelist_most-favorited': 'on',
    'anidb_popular': 'on',
    'anidb_latest-started': 'on',
    'anidb_latest-ended': 'on',
    'anidb_best-of-10s': 'on',
    'anidb_best-of-00s': 'on',
    'anidb_best-of-90s': 'on',
    'anidb_best-of-80s': 'on',
    'anilist_trending-now': 'on',
    'anilist_popular-this-season': 'on',
    'anilist_upcoming-next-season': 'on',
    'anilist_all-time-popular': 'on',
    'anilist_top-anime': 'on',
    'kitsu_top-airing': 'on',
    'kitsu_most-popular': 'on',
    'kitsu_highest-rated': 'on',
    'anisearch_top-all-time': 'on',
    'anisearch_trending': 'on',
    'anisearch_popular': 'on',
    'livechart_popular': 'on',
    'livechart_top-rated': 'on',
    'notifymoe_airing-now': 'on',
};

const ADDON_MANIFEST_URL = `${ADDON_BASE_URL}/${encodeURIComponent(JSON.stringify(ADDON_CONFIG))}/manifest.json`;

async function testAddon() {
    console.log('='.repeat(80));
    console.log('ADDON CONNECTIVITY TEST');
    console.log('='.repeat(80));
    console.log();

    // Test 1: Fetch Manifest
    console.log('📋 Test 1: Fetching Manifest...');
    console.log('URL:', ADDON_MANIFEST_URL);
    console.log();

    try {
        const manifestResponse = await fetch(ADDON_MANIFEST_URL);
        console.log('Status:', manifestResponse.status, manifestResponse.statusText);
        console.log('Headers:', Object.fromEntries(manifestResponse.headers.entries()));

        const manifest = await manifestResponse.json();
        console.log('✅ Manifest fetched successfully!');
        console.log('Addon ID:', manifest.id);
        console.log('Addon Name:', manifest.name);
        console.log('Version:', manifest.version);
        console.log('Catalogs:', manifest.catalogs?.length || 0);
        console.log();
    } catch (error) {
        console.error('❌ Manifest fetch failed:', error);
        return;
    }

    // Test 2: Fetch Catalog (No Extra Params)
    console.log('📺 Test 2: Fetching anilist_trending-now (no filters)...');
    const catalogUrl1 = `${ADDON_BASE_URL}/${encodeURIComponent(JSON.stringify(ADDON_CONFIG))}/catalog/anime/anilist_trending-now.json`;
    console.log('URL:', catalogUrl1);
    console.log();

    try {
        const catalogResponse1 = await fetch(catalogUrl1);
        console.log('Status:', catalogResponse1.status, catalogResponse1.statusText);

        const catalog1 = await catalogResponse1.json();
        console.log('Results:', catalog1.metas?.length || 0);

        if (catalog1.metas && catalog1.metas.length > 0) {
            console.log('✅ Catalog fetched successfully!');
            console.log('First item:', {
                id: catalog1.metas[0].id,
                name: catalog1.metas[0].name,
                genres: catalog1.metas[0].genres,
                poster: catalog1.metas[0].poster?.substring(0, 50) + '...',
            });
        } else {
            console.log('⚠️  Empty catalog returned');
        }
        console.log();
    } catch (error) {
        console.error('❌ Catalog fetch failed:', error);
    }

    // Test 3: Fetch Catalog (With Genre Filter)
    console.log('🎭 Test 3: Fetching anilist_trending-now (genre=Action)...');
    const catalogUrl2 = `${ADDON_BASE_URL}/${encodeURIComponent(JSON.stringify(ADDON_CONFIG))}/catalog/anime/anilist_trending-now/genre=Action.json`;
    console.log('URL:', catalogUrl2);
    console.log();

    try {
        const catalogResponse2 = await fetch(catalogUrl2);
        console.log('Status:', catalogResponse2.status, catalogResponse2.statusText);

        const catalog2 = await catalogResponse2.json();
        console.log('Results:', catalog2.metas?.length || 0);

        if (catalog2.metas && catalog2.metas.length > 0) {
            console.log('✅ Filtered catalog fetched successfully!');
            console.log('First item:', {
                id: catalog2.metas[0].id,
                name: catalog2.metas[0].name,
                genres: catalog2.metas[0].genres,
            });
        } else {
            console.log('⚠️  Empty catalog returned');
        }
        console.log();
    } catch (error) {
        console.error('❌ Filtered catalog fetch failed:', error);
    }

    // Test 4: Try Different Catalog
    console.log('📊 Test 4: Fetching myanimelist_top-all-time...');
    const catalogUrl3 = `${ADDON_BASE_URL}/${encodeURIComponent(JSON.stringify(ADDON_CONFIG))}/catalog/anime/myanimelist_top-all-time.json`;
    console.log('URL:', catalogUrl3);
    console.log();

    try {
        const catalogResponse3 = await fetch(catalogUrl3);
        console.log('Status:', catalogResponse3.status, catalogResponse3.statusText);

        const catalog3 = await catalogResponse3.json();
        console.log('Results:', catalog3.metas?.length || 0);

        if (catalog3.metas && catalog3.metas.length > 0) {
            console.log('✅ MAL catalog fetched successfully!');
            console.log('First item:', {
                id: catalog3.metas[0].id,
                name: catalog3.metas[0].name,
                genres: catalog3.metas[0].genres,
            });
        } else {
            console.log('⚠️  Empty catalog returned');
        }
        console.log();
    } catch (error) {
        console.error('❌ MAL catalog fetch failed:', error);
    }

    // Test 5: Try Simpler URL (Without Config)
    console.log('🔧 Test 5: Testing if addon works without config...');
    const simpleManifestUrl = `${ADDON_BASE_URL}/manifest.json`;
    console.log('URL:', simpleManifestUrl);
    console.log();

    try {
        const simpleResponse = await fetch(simpleManifestUrl);
        console.log('Status:', simpleResponse.status, simpleResponse.statusText);

        if (simpleResponse.ok) {
            const simpleManifest = await simpleResponse.json();
            console.log('✅ Simple URL works!');
            console.log('Addon ID:', simpleManifest.id);

            // Try fetching catalog with simple URL
            const simpleCatalogUrl = `${ADDON_BASE_URL}/catalog/anime/anilist_trending-now.json`;
            console.log('Trying catalog with simple URL:', simpleCatalogUrl);

            const simpleCatalogResponse = await fetch(simpleCatalogUrl);
            const simpleCatalog = await simpleCatalogResponse.json();
            console.log('Results:', simpleCatalog.metas?.length || 0);

            if (simpleCatalog.metas && simpleCatalog.metas.length > 0) {
                console.log('✅✅✅ FOUND WORKING URL FORMAT! Use simple URL without config.');
            }
        }
        console.log();
    } catch (error) {
        console.error('❌ Simple URL failed:', error);
    }

    console.log('='.repeat(80));
    console.log('TEST COMPLETE');
    console.log('='.repeat(80));
}

// Run the test
testAddon().catch(console.error);
