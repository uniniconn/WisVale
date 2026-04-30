// functions/api/shared/db.ts

export interface DBResult {
  results: any[];
  meta?: any;
}

export interface DBDriver {
  query(sql: string, binds?: any[]): Promise<DBResult>;
  first(sql: string, binds?: any[]): Promise<any | null>;
  run(sql: string, binds?: any[]): Promise<void>;
}

export function createDriver(env: any): DBDriver {
  // Cloudflare D1
  if (env.DB && typeof env.DB.prepare === 'function') {
    return {
      async query(sql: string, binds: any[] = []) {
        const { results } = await env.DB.prepare(sql).bind(...binds).all();
        return { results };
      },
      async first(sql: string, binds: any[] = []) {
        return await env.DB.prepare(sql).bind(...binds).first();
      },
      async run(sql: string, binds: any[] = []) {
        await env.DB.prepare(sql).bind(...binds).run();
      }
    };
  }

  throw new Error("D1 Database binding 'DB' not found.");
}
