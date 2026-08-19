/**
 * MySQL (this project's Prisma provider) does not support
 * `contains: { mode: "insensitive" }`. Typical MySQL collations are
 * already case-insensitive, so a plain `contains` is the correct filter.
 */
export function buildLeaderSearchWhere(query) {
  const where = { deletedAt: null };
  const trimmed = typeof query === "string" ? query.trim() : "";
  if (!trimmed) {
    return where;
  }

  where.OR = [
    { name: { contains: trimmed } },
    { email: { contains: trimmed } },
    { promoteCode: { contains: trimmed } },
  ];
  return where;
}
