import { neon } from "@neondatabase/serverless";
import { drizzle, NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let _db: NeonHttpDatabase<typeof schema> | null = null;

export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    if (!_db) {
      const url = process.env.DATABASE_URL;
      if (!url) {
        throw new Error("DATABASE_URL environment variable is not set");
      }
      const sql = neon(url);
      _db = drizzle(sql, { schema });
    }
    return Reflect.get(_db, prop, receiver);
  },
});
