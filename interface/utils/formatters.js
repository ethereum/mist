export function formatTokenCount(value, decimals) {
  return Number((value /= Math.pow(10, decimals))).toString();
}

export function formatFunctionName(functionName) {
  if (functionName === undefined)
    throw new Error('formatFunctionName() expects a non-empty string');
  return functionName
    .slice(0, functionName.indexOf('('))
    .replace(/_+/g, ' ')
    .replace(/([A-Z]+|[0-9]+)/g, ' $1')
    .toLowerCase()
    .trim();
}
