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

export function analyzeEtfs(tableData, limit = 5) {
  if (!Array.isArray(tableData)) {
    throw new Error('ETF tableData must be an array.');
  }

  const etfs = tableData.map(row => {
    const name = readCell(row, 0);
    const price = toNumber(readNestedCell(row, 14, 0));
    const threeMonthAvgVolume = toNumber(readCell(row, 15));
    const expenseRatio = toNumber(readCell(row, 17));
    const tradeValue = price * threeMonthAvgVolume;

    return {
      name,
      price,
      threeMonthAvgVolume: toMillionLabel(threeMonthAvgVolume),
      tradeValue: toMillionLabel(tradeValue),
      tradeValueRaw: tradeValue,
      expenseRatio
    };
  });

  const expenseRatios = etfs
    .map(etf => etf.expenseRatio)
    .filter(Number.isFinite);

  const avgExpenseRatio =
    expenseRatios.length > 0
      ? expenseRatios.reduce((total, value) => total + value, 0) / expenseRatios.length
      : null;

  return {
    data: etfs
      .filter(etf => Number.isFinite(etf.tradeValueRaw))
      .sort((a, b) => b.tradeValueRaw - a.tradeValueRaw)
      .slice(0, limit)
      .map(({ tradeValueRaw, ...etf }) => etf),
    avgExpenseRatio: roundToTwo(avgExpenseRatio)
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

function readCell(row, index) {
  const value = row?.[index];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function readNestedCell(row, index, nestedIndex) {
  const value = row?.[index];

  if (Array.isArray(value)) {
    return value[nestedIndex];
  }

  return value;
}

function toNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const match = value.match(/-?\d+(?:,\d{3})*(?:\.\d+)?/);
    return match ? Number(match[0].replaceAll(',', '')) : null;
  }

  return null;
}

function toMillionLabel(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return `${Number((value / 1_000_000).toFixed(2))}M`;
}

function roundToTwo(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(2));
}
