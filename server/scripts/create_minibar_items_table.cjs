const { pgPool } = require('../dist/database/postgres.js');

async function migrateMinibarItems() {
    console.log('--- Migrating Minibar Items Schema ---');
    const client = await pgPool.connect();
    try {
        await client.query('BEGIN');

        await client.query(`
            CREATE TABLE IF NOT EXISTS minibar_items (
                id SERIAL PRIMARY KEY,
                property_id INT NOT NULL DEFAULT 1,
                name VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL DEFAULT 'Beverage',
                price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                par_stock INT NOT NULL DEFAULT 2,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_minibar_items_property 
            ON minibar_items(property_id, is_active);
        `);

        // Check if any items exist for property 1
        const check = await client.query('SELECT COUNT(*) as count FROM minibar_items WHERE property_id = 1');
        const count = parseInt(check.rows[0].count, 10);

        if (count === 0) {
            console.log('Seeding initial 5-star standard minibar catalog...');
            const seedItems = [
                { name: 'Evian Mineral Water (500ml)', category: 'Beverage', price: 150.00, par_stock: 2 },
                { name: 'Coca-Cola Can (330ml)', category: 'Beverage', price: 180.00, par_stock: 2 },
                { name: 'Sprite Lemon-Lime Can (330ml)', category: 'Beverage', price: 180.00, par_stock: 2 },
                { name: 'Red Bull Energy Drink (250ml)', category: 'Beverage', price: 350.00, par_stock: 2 },
                { name: 'Heineken 0.0 Malt Can (330ml)', category: 'Beverage', price: 320.00, par_stock: 2 },
                { name: 'Pringles Potato Crisps (Sour Cream & Onion)', category: 'Snack', price: 250.00, par_stock: 1 },
                { name: 'Cadbury Dairy Milk Silk Chocolate (60g)', category: 'Snack', price: 180.00, par_stock: 2 },
                { name: 'Mixed Roasted Cashew Nuts Jar (100g)', category: 'Snack', price: 280.00, par_stock: 1 },
                { name: 'Gourmet Salted Almonds Jar (100g)', category: 'Snack', price: 320.00, par_stock: 1 },
                { name: 'Haribo Goldbears Gummy Candy (80g)', category: 'Snack', price: 160.00, par_stock: 2 },
                { name: 'Premium Travel Dental & Grooming Kit', category: 'Essentials', price: 220.00, par_stock: 1 }
            ];

            for (const item of seedItems) {
                await client.query(`
                    INSERT INTO minibar_items (property_id, name, category, price, par_stock, is_active)
                    VALUES (1, $1, $2, $3, $4, TRUE)
                `, [item.name, item.category, item.price, item.par_stock]);
            }
            console.log(`Seeded ${seedItems.length} minibar items successfully.`);
        } else {
            console.log(`Table minibar_items already has ${count} records.`);
        }

        await client.query('COMMIT');
        console.log('Minibar schema migration finished successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
}

migrateMinibarItems();
