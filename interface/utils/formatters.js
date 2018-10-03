export function formatTokenCount(value, decimals) {
  return Number((value /= Math.pow(10, decimals))).toString();
}
