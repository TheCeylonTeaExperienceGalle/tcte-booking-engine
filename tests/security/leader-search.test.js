import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildLeaderSearchWhere } from "../../lib/security/leader-search.js";

describe("MySQL-safe leader search", () => {
  it("returns only deletedAt when q is missing or blank", () => {
    expect(buildLeaderSearchWhere(null)).toEqual({ deletedAt: null });
    expect(buildLeaderSearchWhere("")).toEqual({ deletedAt: null });
    expect(buildLeaderSearchWhere("   ")).toEqual({ deletedAt: null });
  });

  it("searches name, email, and promoteCode without mode: insensitive", () => {
    const where = buildLeaderSearchWhere("Tea");
    expect(where.deletedAt).toBeNull();
    expect(where.OR).toEqual([
      { name: { contains: "Tea" } },
      { email: { contains: "Tea" } },
      { promoteCode: { contains: "Tea" } },
    ]);
    const serialized = JSON.stringify(where);
    expect(serialized).not.toContain("insensitive");
    expect(serialized).not.toContain('"mode"');
  });

  it("accepts exact, different-case, and partial queries as contains filters", () => {
    expect(buildLeaderSearchWhere("Nimal")["OR"][0].name.contains).toBe("Nimal");
    expect(buildLeaderSearchWhere("nimal")["OR"][0].name.contains).toBe("nimal");
    expect(buildLeaderSearchWhere("nim")["OR"][1].email.contains).toBe("nim");
    expect(buildLeaderSearchWhere("TCTE")["OR"][2].promoteCode.contains).toBe("TCTE");
  });

  it("keeps the leaders route free of Prisma mode: insensitive", () => {
    const source = readFileSync(
      path.join(process.cwd(), "app/api/leaders/route.js"),
      "utf8"
    );
    expect(source).toContain("buildLeaderSearchWhere");
    expect(source).not.toContain('mode: "insensitive"');
  });
});
