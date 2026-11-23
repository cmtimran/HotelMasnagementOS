const { pgPool } = require('../dist/database/postgres.js');

async function seedRates() {
    const seedRates = [
        ['USD', 'BDT', 122.50, 'Bangladesh Bank Daily Interbank'],
        ['EUR', 'BDT', 129.80, 'European Central Bank Reference'],
        ['GBP', 'BDT', 154.20, 'Bank of England Reference'],
        ['AED', 'BDT', 33.35,  'UAE Central Bank Official'],
        ['INR', 'BDT', 1.42,   'Reserve Bank of India Reference'],
        ['SAR', 'BDT', 32.65,  'Saudi Central Bank Reference']
    ];
    for (const r of seedRates) {
        await pgPool.query(
            'INSERT INTO currency_exchange_rates (property_id, from_currency, to_currency, exchange_rate, effective_date, source) VALUES (1, $1, $2, $3, CURRENT_DATE, $4);',
            [r[0], r[1], r[2], r[3]]
        );
    }
    console.log('Seeded 6 currency rates successfully.');
    const res = await pgPool.query('SELECT from_currency, to_currency, exchange_rate, effective_date FROM currency_exchange_rates;');
    console.table(res.rows);
    process.exit(0);
}

seedRates().catch(e => { console.error(e); process.exit(1); });
