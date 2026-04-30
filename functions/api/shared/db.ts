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

  // OCI MySQL (Node.js environment)
  return {
    async query(sql: string, binds: any[] = []) {
      const mysql = await import('mysql2/promise');
      const pool = mysql.createPool({
        host: env.OCI_MYSQL_HOST || process?.env?.OCI_MYSQL_HOST,
        user: env.OCI_MYSQL_USER || process?.env?.OCI_MYSQL_USER,
        password: env.OCI_MYSQL_PASSWORD || process?.env?.OCI_MYSQL_PASSWORD,
        database: env.OCI_MYSQL_DATABASE || process?.env?.OCI_MYSQL_DATABASE,
        ssl: { rejectUnauthorized: false }
      });
      const [rows] = await pool.execute(sql, binds);
      return { results: rows as any[] };
    },
    async first(sql: string, binds: any[] = []) {
      const mysql = await import('mysql2/promise');
      const pool = mysql.createPool({
        host: env.OCI_MYSQL_HOST || process?.env?.OCI_MYSQL_HOST,
        user: env.OCI_MYSQL_USER || process?.env?.OCI_MYSQL_USER,
        password: env.OCI_MYSQL_PASSWORD || process?.env?.OCI_MYSQL_PASSWORD,
        database: env.OCI_MYSQL_DATABASE || process?.env?.OCI_MYSQL_DATABASE,
        ssl: { rejectUnauthorized: false }
      });
      const [rows] = await pool.execute(sql, binds);
      const results = rows as any[];
      return results.length > 0 ? results[0] : null;
    },
    async run(sql: string, binds: any[] = []) {
      const mysql = await import('mysql2/promise');
      const pool = mysql.createPool({
        host: env.OCI_MYSQL_HOST || process?.env?.OCI_MYSQL_HOST,
        user: env.OCI_MYSQL_USER || process?.env?.OCI_MYSQL_USER,
        password: env.OCI_MYSQL_PASSWORD || process?.env?.OCI_MYSQL_PASSWORD,
        database: env.OCI_MYSQL_DATABASE || process?.env?.OCI_MYSQL_DATABASE,
        ssl: { rejectUnauthorized: false }
      });
      await pool.execute(sql, binds);
    }
  };
}
