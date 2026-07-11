interface QueryResult {
  rows: Array<Record<string, unknown>>;
  rowCount: number;
}

export class SupabaseManagementQueryClient {
  private readonly token: string;
  private readonly ref: string;
  private readonly fetchImpl: typeof fetch;
  private transaction: string[] | null = null;

  constructor(options: { managementToken: string; projectRef: string; fetchImpl?: typeof fetch }) {
    this.token = options.managementToken;
    this.ref = options.projectRef;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async connect(): Promise<void> {}

  async end(): Promise<void> {}

  async query(sql: string, parameters: unknown[] = []): Promise<QueryResult> {
    const statement = interpolateSql(sql, parameters);
    if (statement.trim().toUpperCase() === "BEGIN") {
      this.transaction = [];
      return emptyResult();
    }
    if (statement.trim().toUpperCase() === "ROLLBACK") {
      this.transaction = null;
      return emptyResult();
    }
    if (statement.trim().toUpperCase() === "COMMIT") {
      const transactionSql = `BEGIN;\n${(this.transaction ?? []).join(";\n")};\nCOMMIT;`;
      this.transaction = null;
      return this.execute(transactionSql);
    }
    if (this.transaction) {
      this.transaction.push(statement.replace(/;\s*$/, ""));
      return emptyResult();
    }
    return this.execute(statement);
  }

  private async execute(query: string): Promise<QueryResult> {
    const response = await this.fetchImpl(
      `https://api.supabase.com/v1/projects/${encodeURIComponent(this.ref)}/database/query`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query })
      }
    );
    const text = await response.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : [];
    } catch {
      body = { message: "Supabase returned a non-JSON database response." };
    }
    if (!response.ok) {
      const record = isRecord(body) ? body : {};
      const message = record.message ?? record.error ?? `HTTP ${response.status}`;
      throw new Error(`Supabase database query failed: ${String(message)}`);
    }
    const rows = Array.isArray(body)
      ? body.filter(isRecord)
      : isRecord(body) && Array.isArray(body.result)
        ? body.result.filter(isRecord)
        : [];
    return { rows, rowCount: rows.length };
  }
}

export function interpolateSql(sql: string, parameters: unknown[]): string {
  return parameters.reduceRight<string>(
    (statement, value, index) =>
      statement.replaceAll(new RegExp(`\\$${index + 1}(?!\\d)`, "g"), sqlLiteral(value)),
    sql
  );
}

function sqlLiteral(value: unknown): string {
  if (value == null) return "NULL";
  if (Array.isArray(value)) return `ARRAY[${value.map(sqlLiteral).join(",")}]`;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Non-finite SQL numeric parameter.");
    return String(value);
  }
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function emptyResult(): QueryResult {
  return { rows: [], rowCount: 0 };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
