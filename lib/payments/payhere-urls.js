export function appendOrderIdToUrl(rawUrl, orderId) {
  if (!rawUrl) {
    throw new Error("PayHere URL is not configured");
  }
  const url = new URL(String(rawUrl));
  url.searchParams.set("order_id", String(orderId));
  return url.toString();
}
