/**
 * PayHere is opt-in. Missing or any value other than "true" keeps checkout disabled.
 * Do not infer from NODE_ENV or from whether merchant env vars exist.
 */
export function isPayHereEnabled(env = process.env) {
  return env.PAYHERE_ENABLED === "true";
}
