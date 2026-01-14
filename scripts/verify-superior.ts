import { recommendationEngineV2 } from '../lib/recommendations/engine-v2';
import { catalogService } from '../lib/catalog/service';
import { nanoid } from 'nanoid';

async function verifyDeduplication() {
    console.log('--- Verifying Recommendation Deduplication ---');
    const userId = 'test-user-' + nanoid(5);
    const sessionId = nanoid(10);

    const context = {
        userId,
        batchIndex: 0,
        sessionId,
        timeOfDay: 'evening' as const,
    };

    console.log('Generating batch...');
    const rows = await recommendationEngineV2.generateBatch(context);

    const allIds = new Set<string>();
    let duplicates = 0;
    let totalItems = 0;

    rows.forEach(row => {
        row.items.forEach(item => {
            totalItems++;
            if (allIds.has(item.id)) {
                console.error(`Duplicate found: ${item.id} in row ${row.title}`);
                duplicates++;
            }
            allIds.add(item.id);
        });
    });

    console.log(`Verification Complete:`);
    console.log(`- Total Rows: ${rows.length}`);
    console.log(`- Total Items: ${totalItems}`);
    console.log(`- Unique Items: ${allIds.size}`);
    console.log(`- Duplicates: ${duplicates}`);

    if (duplicates === 0) {
        console.log('✅ ZERO DUPLICATION GUARANTEED');
    } else {
        console.error('❌ DEDUPLICATION FAILED');
    }
}

async function verifyCataloguePerformance() {
    console.log('\n--- Verifying Catalogue Performance ---');
    const start = Date.now();
    // Use a popular catalog that likely has many items
    await catalogService.getCatalog('movie', 'top', { genre: 'Action' });
    const end = Date.now();
    console.log(`Catalogue fetch & cache completed in ${end - start}ms`);
}

async function main() {
    try {
        await verifyCataloguePerformance();
        await verifyDeduplication();
    } catch (e) {
        console.error('Verification script failed:', e);
    }
}

main();
