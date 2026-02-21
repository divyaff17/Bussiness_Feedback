import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const dbPath = path.resolve(__dirname, 'feedback.db');

let db = null;

// Initialize database
export async function initDatabase() {
    const SQL = await initSqlJs();

    // Check if database file exists
    if (fs.existsSync(dbPath)) {
        const buffer = fs.readFileSync(dbPath);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }

    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.run(schema);

    // Save to file
    saveDatabase();

    console.log('✅ Database initialized successfully');
    return db;
}

// Save database to file
export function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    }
}

// Get database instance
export function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

// Helper functions to match better-sqlite3 API
export const dbHelpers = {
    prepare(sql) {
        return {
            run(...params) {
                db.run(sql, params);
                saveDatabase();
                return this;
            },
            get(...params) {
                const result = db.exec(sql, params);
                if (result.length === 0 || result[0].values.length === 0) {
                    return undefined;
                }
                const columns = result[0].columns;
                const values = result[0].values[0];
                const row = {};
                columns.forEach((col, i) => {
                    row[col] = values[i];
                });
                return row;
            },
            all(...params) {
                const result = db.exec(sql, params);
                if (result.length === 0) {
                    return [];
                }
                const columns = result[0].columns;
                return result[0].values.map(values => {
                    const row = {};
                    columns.forEach((col, i) => {
                        row[col] = values[i];
                    });
                    return row;
                });
            }
        };
    },
    exec(sql) {
        db.run(sql);
        saveDatabase();
    }
};

export default { initDatabase, getDb, saveDatabase, dbHelpers };
