export function summarizeNumbers(input) {
  const values = collectNumbers(input);

  if (values.length === 0) {
    return {
      count: 0,
      sum: 0,
      average: null,
      min: null,
      max: null
    };
  }

  const sum = values.reduce((total, value) => total + value, 0);

  return {
    count: values.length,
    sum,
    average: sum / values.length,
    min: Math.min(...values),
    max: Math.max(...values)
  };
}

function collectNumbers(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return [value];
  }

  if (typeof value === 'string') {
    return extractNumbers(value);
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectNumbers);
  }

  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(collectNumbers);
  }

  return [];
}

function extractNumbers(text) {
  const matches = text.match(/-?\d+(?:,\d{3})*(?:\.\d+)?/g) || [];
  return matches
    .map(match => Number(match.replaceAll(',', '')))
    .filter(Number.isFinite);
}
