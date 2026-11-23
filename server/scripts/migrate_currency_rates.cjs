const { pgPool } = require('../dist/database/postgres.js');

async function migrateCurrencyRates() {
    console.log('--- Migrating Currency Exchange Rates Schema ---');
    try {
        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS currency_exchange_rates (
                id SERIAL PRIMARY KEY,
                property_id INT NOT NULL DEFAULT 1,
                from_currency VARCHAR(10) NOT NULL,
                to_currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
                exchange_rate NUMERIC(14, 6) NOT NULL,
                effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
                source VARCHAR(100) DEFAULT 'Bangladesh Bank / Treasury',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_currency_pair_date UNIQUE (property_id, from_currency, to_currency, effective_date)
            );
        `);

        await pgPool.query(`
            CREATE INDEX IF NOT EXISTS idx_currency_rates_pair 
            ON currency_exchange_rates(property_id, from_currency, to_currency, effective_date);
        `);

        // Check if exchange rates exist
        const check = await pgPool.query('SELECT COUNT(*) as count FROM currency_exchange_rates WHERE property_id = 1');
        if (parseInt(check.rows[0].count, 10) === 0) {
            console.log('Seeding initial central bank foreign exchange rates...');
            const seedRates = [
                { from: 'USD', to: 'BDT', rate: 122.50, source: 'Bangladesh Bank Daily Interbank' },
                { from: 'EUR', to: 'BDT', rate: 129.80, source: 'European Central Bank Reference' },
                { from: 'GBP', to: 'BDT', rate: 154.20, source: 'Bank of England Reference' },
                { from: 'AED', to: 'BDT', rate: 33.35,  source: 'UAE Central Bank Official' },
                { from: 'INR', to: 'BDT', rate: 1.42,   source: 'Reserve Bank of India Reference' },
                { from: 'SAR', to: 'BDT', rate: 32.65,  source: 'Saudi Central Bank Reference' }
            ];

            for (const r of seedRates) {
                await pgPool.query(`
                    INSERT INTO currency_exchange_rates (property_id, from_currency, to_currency, exchange_rate, effective_date, source)
                    VALUES (1, $1, $2, $3, CURRENT_DATE, $4)
                    ON CONFLICT (property_id, from_currency, to_currency, effective_date) DO NOTHING;
                `, [r.from, r.to, r.rate, r.source]);
            }
            console.log('Seeded standard exchange rates successfully.');
        }

        // Alter folio_charges & folio_payments
        await pgPool.query(`
            ALTER TABLE folio_charges ADD COLUMN IF NOT EXISTS transaction_currency VARCHAR(10) DEFAULT 'BDT';
            ALTER TABLE folio_charges ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(14,6) DEFAULT 1.000000;
            ALTER TABLE folio_charges ADD COLUMN IF NOT EXISTS base_currency_amount NUMERIC(12,2) DEFAULT 0.00;
        `);

        await pgPool.query(`
            ALTER TABLE folio_payments ADD COLUMN IF NOT EXISTS transaction_currency VARCHAR(10) DEFAULT 'BDT';
            ALTER TABLE folio_payments ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(14,6) DEFAULT 1.000000;
            ALTER TABLE folio_payments ADD COLUMN IF NOT EXISTS base_currency_amount NUMERIC(12,2) DEFAULT 0.00;
            ALTER TABLE folio_payments ADD COLUMN IF NOT EXISTS forex_gain_loss NUMERIC(12,2) DEFAULT 0.00;
        `);

        console.log('Currency exchange rates schema migration finished successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pgPool.end();
        process.exit(0);
    }
}

migrateCurrencyRates();
