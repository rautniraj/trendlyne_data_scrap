import puppeteer from 'puppeteer';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

export async function fetchWithBrowser(options = {}) {
  const {
    url,
    method = 'GET',
    headers = {},
    body,
    selector,
    waitForSelector,
    timeoutMs = 30000
  } = options;

  if (!url || typeof url !== 'string') {
    throw badRequest('A valid url is required.');
  }

  const browser = await puppeteer.launch({
    headless: process.env.PUPPETEER_HEADLESS !== 'false',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(DEFAULT_USER_AGENT);
    await page.setViewport({ width: 1366, height: 768, deviceScaleFactor: 1 });
    await page.setExtraHTTPHeaders(normalizeHeaders(headers));

    if (method.toUpperCase() === 'GET') {
      return await loadPage(page, { url, selector, waitForSelector, timeoutMs });
    }

    return await browserFetch(page, { url, method, headers, body, timeoutMs });
  } finally {
    await browser.close();
  }
}

async function loadPage(page, { url, selector, waitForSelector, timeoutMs }) {
  const response = await page.goto(url, {
    waitUntil: 'networkidle2',
    timeout: timeoutMs
  });

  if (waitForSelector) {
    await page.waitForSelector(waitForSelector, { timeout: timeoutMs });
  }

  const contentType = response?.headers()['content-type'] || '';
  const status = response?.status() || null;
  const text = selector
    ? await page.$eval(selector, element => element.textContent.trim())
    : await page.evaluate(() => document.body.innerText);

  return {
    url,
    status,
    contentType,
    data: parseMaybeJson(text)
  };
}

async function browserFetch(page, { url, method, headers, body, timeoutMs }) {
  const result = await page.evaluate(
    async ({ requestUrl, requestMethod, requestHeaders, requestBody, requestTimeoutMs }) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

      try {
        const response = await fetch(requestUrl, {
          method: requestMethod,
          headers: requestHeaders,
          body: requestBody,
          signal: controller.signal
        });
        const text = await response.text();

        return {
          status: response.status,
          contentType: response.headers.get('content-type') || '',
          text
        };
      } finally {
        clearTimeout(timeout);
      }
    },
    {
      requestUrl: url,
      requestMethod: method.toUpperCase(),
      requestHeaders: normalizeHeaders(headers),
      requestBody: formatBody(body, headers),
      requestTimeoutMs: timeoutMs
    }
  );

  return {
    url,
    status: result.status,
    contentType: result.contentType,
    data: parseMaybeJson(result.text)
  };
}

function normalizeHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers || {}).map(([key, value]) => [key, String(value)])
  );
}

function formatBody(body, headers) {
  if (body == null) {
    return undefined;
  }

  if (typeof body === 'string') {
    return body;
  }

  const contentType = Object.entries(headers || {}).find(
    ([key]) => key.toLowerCase() === 'content-type'
  )?.[1];

  if (contentType?.includes('application/x-www-form-urlencoded')) {
    return new URLSearchParams(body).toString();
  }

  return JSON.stringify(body);
}

function parseMaybeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}
