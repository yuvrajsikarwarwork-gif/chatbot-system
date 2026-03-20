"use strict";
// src/models/queueJobModel.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJob = createJob;
exports.updateJobStatus = updateJobStatus;
const db_1 = require("../config/db");
async function createJob(type, payload) {
    const res = await (0, db_1.query)(`
    INSERT INTO queue_jobs
    (type, status, payload)
    VALUES ($1,'pending',$2)
    RETURNING *
    `, [type, payload]);
    return res.rows[0];
}
async function updateJobStatus(id, status) {
    await (0, db_1.query)(`
    UPDATE queue_jobs
    SET status = $1
    WHERE id = $2
    `, [status, id]);
}
//# sourceMappingURL=queueJobModel.js.map