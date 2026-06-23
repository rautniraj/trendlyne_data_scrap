import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fetchWithBrowser } from './services/browserFetch.js';
import { summarizeNumbers } from './services/math.js';

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
  const summary = summarizeNumbers(result.data);

  console.log('Fetched:', result.url);
  console.log('Status:', result.status);
  console.log('Content-Type:', result.contentType || 'unknown');
  console.log('\nSummary:');
  console.table(summary);
  console.log('\nRaw data:');
  console.log(JSON.stringify(result.data, null, 2));
} catch (error) {
  console.error('Failed:', error.message);
  process.exitCode = 1;
}
