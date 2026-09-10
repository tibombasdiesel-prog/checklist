import type { Client, ResultSet } from "@libsql/client";

export class D1DatabaseWrapper {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  prepare(sql: string) {
    return new D1PreparedStatementWrapper(this.client, sql);
  }

  async batch(statements: D1PreparedStatementWrapper[]) {
    const sqlStatements = statements.map(s => ({
      sql: s.sql,
      args: s.args
    }));
    const results = await this.client.batch(sqlStatements, "write");
    return results.map((r: ResultSet) => ({
      results: r.rows as any[],
      success: true,
      meta: {
        changes: r.rowsAffected,
        last_row_id: r.lastInsertRowid !== undefined ? Number(r.lastInsertRowid) : undefined
      }
    }));
  }

  async exec(sql: string) {
    await this.client.execute(sql);
    return { count: 1, duration: 0 };
  }
}

export class D1PreparedStatementWrapper {
  private client: Client;
  public sql: string;
  public args: any[];

  constructor(client: Client, sql: string, args: any[] = []) {
    this.client = client;
    this.sql = sql;
    this.args = args;
  }

  bind(...args: any[]) {
    // Flatten arguments and convert booleans to 0/1 to match SQLite/D1 behavior
    const flatArgs = args.map(arg => {
      if (typeof arg === 'boolean') {
        return arg ? 1 : 0;
      }
      return arg;
    });
    return new D1PreparedStatementWrapper(this.client, this.sql, flatArgs);
  }

  async run() {
    const res = await this.client.execute({ sql: this.sql, args: this.args });
    return {
      success: true,
      meta: {
        changes: res.rowsAffected,
        last_row_id: res.lastInsertRowid !== undefined ? Number(res.lastInsertRowid) : undefined
      }
    };
  }

  async all() {
    const res = await this.client.execute({ sql: this.sql, args: this.args });
    return {
      results: res.rows as any[],
      success: true,
      meta: {
        changes: res.rowsAffected,
        last_row_id: res.lastInsertRowid !== undefined ? Number(res.lastInsertRowid) : undefined
      }
    };
  }

  async first<T = any>(colName?: string): Promise<T | null> {
    const res = await this.client.execute({ sql: this.sql, args: this.args });
    if (res.rows.length === 0) {
      return null;
    }
    const row = res.rows[0] as any;
    if (colName) {
      return row[colName] as T;
    }
    return row as T;
  }

  async raw() {
    const res = await this.client.execute({ sql: this.sql, args: this.args });
    return res.rows.map((row: any) => Object.values(row));
  }
}
