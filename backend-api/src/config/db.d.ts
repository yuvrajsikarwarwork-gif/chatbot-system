import { Pool } from "pg";
export declare const db: Pool;
export declare const connectDB: () => Promise<void>;
export declare const query: (text: string, params?: any[]) => Promise<import("pg").QueryResult<any>>;
//# sourceMappingURL=db.d.ts.map