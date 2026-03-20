"use strict";
// src/utils/logger.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = log;
function log(...args) {
    console.log(new Date().toISOString(), ...args);
}
//# sourceMappingURL=logger.js.map