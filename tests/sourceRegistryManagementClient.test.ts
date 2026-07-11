import { describe, expect, it, vi } from "vitest";

import { interpolateSql, SupabaseManagementQueryClient } from "@/lib/supabaseManagementQueryClient";

describe("Supabase source registry management client", () => {
  it("quotes parameters without confusing positional prefixes", () => {
    expect(interpolateSql("select $1, $10, $2", ["one", "two", 3, 4, 5, 6, 7, 8, 9, "ten"])).toBe(
      "select 'one', 'ten', 'two'"
    );
    expect(interpolateSql("select $1", ["O'Reilly"])).toBe("select 'O''Reilly'");
  });

  it("submits a buffered transaction as one management query", async () => {
    const fetchImpl = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return new Response("[]", { status: 201 });
    });
    const client = new SupabaseManagementQueryClient({
      managementToken: "secret-token",
      projectRef: "abcdefghijklmnopqrst",
      fetchImpl
    });

    await client.query("BEGIN");
    await client.query("insert into vmesh.test(id) values ($1)", ["row-1"]);
    await client.query("update vmesh.test set id=$1 where id=$2", ["row-2", "row-1"]);
    await client.query("COMMIT");

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, init] = fetchImpl.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.query).toContain("BEGIN;");
    expect(body.query).toContain("'row-1'");
    expect(body.query).toContain("COMMIT;");
  });
});
