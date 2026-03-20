"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUserByEmail = findUserByEmail;
exports.findUserById = findUserById;
exports.createUser = createUser;
const db_1 = require("../config/db");
async function findUserByEmail(email) {
    // Now that the column exists, this SELECT will succeed
    const res = await (0, db_1.query)("SELECT id, email, password_hash AS password, role FROM users WHERE email = $1", [email]);
    return res.rows[0];
}
async function findUserById(id) {
    const res = await (0, db_1.query)("SELECT id, email, password_hash AS password, role FROM users WHERE id = $1", [id]);
    return res.rows[0];
}
async function createUser(email, passwordHash, name, role = 'user') {
    const res = await (0, db_1.query)(`
    INSERT INTO users (id, email, password_hash, name, role)
    VALUES (gen_random_uuid(), $1, $2, $3, $4)
    RETURNING id, email, name, role
    `, [email, passwordHash, name, role]);
    return res.rows[0];
}
//# sourceMappingURL=userModel.js.map