export function roundMoney(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.round(numeric * 100) / 100;
}

export function moneyEquals(left, right) {
  return roundMoney(left) === roundMoney(right);
}
