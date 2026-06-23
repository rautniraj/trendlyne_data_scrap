import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fetchWithBrowser } from './services/browserFetch.js';
import { analyzeEtfs } from './services/math.js';

if (existsSync('.env')) {
  loadEnvFile('.env');
}

const request = {
  url: process.env.API_URL || 'https://api.github.com/repos/puppeteer/puppeteer',
  method: process.env.API_METHOD || 'GET',
  headers: {
    accept: 'application/json'
  },
  selector: process.env.CSS_SELECTOR || undefined
};

try {
  const result = await fetchWithBrowser(request);
  const etfArray = result.data.body.tableData;
  const output = analyzeEtfs(etfArray, 10);

  console.log(JSON.stringify(output, null, 2));
} catch (error) {
  console.error('Failed:', error.message);
  process.exitCode = 1;
}
