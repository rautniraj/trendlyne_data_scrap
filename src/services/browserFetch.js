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
    const requestHeaders = withDefaultHeaders(headers);
    await page.setExtraHTTPHeaders(requestHeaders);

    if (method.toUpperCase() === 'GET' && (selector || waitForSelector)) {
      return await loadPage(page, { url, selector, waitForSelector, timeoutMs });
    }

    await openRequestOrigin(page, url, timeoutMs);
    return await browserFetch(page, { url, method, headers: requestHeaders, body, timeoutMs });
  } finally {
    await browser.close();
  }
}

async function openRequestOrigin(page, url, timeoutMs) {
  const origin = new URL(url).origin;

  await page.goto(origin, {
    waitUntil: 'domcontentloaded',
    timeout: timeoutMs
  });
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
  const requestMethod = method.toUpperCase();
  let result = await fetchFromPage(page, {
    url,
    method: requestMethod,
    headers,
    body,
    timeoutMs
  });

  if (shouldRetryAsJson({ result, method: requestMethod, headers })) {
    const jsonUrl = withJsonFormat(url);
    result = await fetchFromPage(page, {
      url: jsonUrl,
      method: requestMethod,
      headers,
      body,
      timeoutMs
    });
  }

  return {
    url: result.url,
    status: result.status,
    contentType: result.contentType,
    data: parseMaybeJson(result.text)
  };
}

async function fetchFromPage(page, { url, method, headers, body, timeoutMs }) {
  return await page.evaluate(
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
          url: response.url,
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
      requestMethod: method,
      requestHeaders: normalizeHeaders(headers),
      requestBody: formatBody(body, headers),
      requestTimeoutMs: timeoutMs
    }
  );
}

function normalizeHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers || {}).map(([key, value]) => [key, String(value)])
  );
}

function withDefaultHeaders(headers) {
  return {
    accept: 'application/json',
    ...normalizeHeaders(headers)
  };
}

function shouldRetryAsJson({ result, method, headers }) {
  const accept = Object.entries(headers || {}).find(
    ([key]) => key.toLowerCase() === 'accept'
  )?.[1];

  return (
    method === 'GET' &&
    String(accept).includes('application/json') &&
    !result.contentType.includes('application/json') &&
    result.text.includes('Django REST framework')
  );
}

function withJsonFormat(url) {
  const nextUrl = new URL(url);

  if (!nextUrl.searchParams.has('format')) {
    nextUrl.searchParams.set('format', 'json');
  }

  return nextUrl.toString();
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
