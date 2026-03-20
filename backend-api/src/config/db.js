"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = exports.connectDB = exports.db = void 0;
const pg_1 = require("pg");
const env_1 = require("./env");
exports.db = new pg_1.Pool({
    connectionString: env_1.env.DB_URL,
});
// Added: Connection validation logic
const connectDB = async () => {
    try {
        const client = await exports.db.connect();
        console.log("PostgreSQL Connected successfully");
        client.release();
    }
    catch (err) {
        console.error("PostgreSQL Connection Error:", err);
        throw err; // Force server.ts to handle the failure
    }
};
exports.connectDB = connectDB;
const query = (text, params) => {
    return exports.db.query(text, params);
};
exports.query = query;
//# sourceMappingURL=db.js.map