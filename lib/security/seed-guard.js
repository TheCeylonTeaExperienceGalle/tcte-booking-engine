export function shouldAllowSeed(env = process.env) {
  return !(env.NODE_ENV === "production" && env.ALLOW_SEED !== "true");
}
