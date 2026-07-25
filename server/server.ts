import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, request, type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { connectToDatabase } from '../api/lib/db.js';

import dataHandler from '../api/data.js';
import webhookHandler from '../api/webhook.js';

type ApiRequest = IncomingMessage & {
  body?: unknown;
};

type ApiResponse = ServerResponse & {
  status: (code: number) => ApiResponse;
  json: (payload: unknown) => void;
  send: (payload: unknown) => void;
};

const PORT = Number(process.env.PORT || 3000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticRoot = path.resolve(__dirname, '..', '..', 'dist');

const mimeTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function withApiResponse(res: ServerResponse): ApiResponse {
  const apiRes = res as ApiResponse;

  apiRes.status = (code: number) => {
    res.statusCode = code;
    return apiRes;
  };

  apiRes.json = (payload: unknown) => {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    res.end(JSON.stringify(payload));
  };

  apiRes.send = (payload: unknown) => {
    if (typeof payload === 'object') {
      apiRes.json(payload);
      return;
    }
    res.end(String(payload ?? ''));
  };

  return apiRes;
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  const contentType = String(req.headers['content-type'] || '');

  if (contentType.includes('application/json')) {
    return rawBody ? JSON.parse(rawBody) : undefined;
  }

  return rawBody;
}

function setCommonHeaders(res: ServerResponse) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

async function handleApi(req: ApiRequest, res: ServerResponse, pathname: string) {
  try {
    req.body = await readBody(req);
  } catch {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ success: false, error: 'Invalid request body' }));
    return;
  }

  const apiRes = withApiResponse(res);

  try {
    if (pathname === '/api/data') {
      await dataHandler(req, apiRes);
      return;
    }

    if (pathname === '/api/webhook') {
      await webhookHandler(req, apiRes);
      return;
    }
  } catch (error) {
    console.error('API request failed:', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      apiRes.json({ success: false, error: 'Internal server error' });
    }
    return;
  }

  res.statusCode = 404;
  apiRes.json({ success: false, error: 'API route not found' });
}

async function sendFile(res: ServerResponse, filePath: string) {
  const extension = path.extname(filePath);
  res.setHeader('Content-Type', mimeTypes[extension] || 'application/octet-stream');

  if (filePath.includes(`${path.sep}assets${path.sep}`)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    res.setHeader('Cache-Control', 'no-cache');
  }

  createReadStream(filePath).pipe(res);
}

async function handleStatic(req: IncomingMessage, res: ServerResponse, pathname: string) {
  if (pathname === '/healthz') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('ok');
    return;
  }

  const decodedPath = decodeURIComponent(pathname);
  const requestedPath = path.resolve(staticRoot, `.${decodedPath}`);

  if (!requestedPath.startsWith(staticRoot)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  const candidatePath = decodedPath.endsWith('/')
    ? path.join(requestedPath, 'index.html')
    : requestedPath;

  try {
    const fileStat = await stat(candidatePath);
    if (fileStat.isFile()) {
      await sendFile(res, candidatePath);
      return;
    }
  } catch {
    // Fall back to the SPA entrypoint below.
  }

  await sendFile(res, path.join(staticRoot, 'index.html'));
}

createServer(async (req, res) => {
  setCommonHeaders(res);

  try {
    const host = req.headers.host || 'localhost';
    const url = new URL(req.url || '/', `http://${host}`);

    if (url.pathname.startsWith('/api/')) {
      await handleApi(req as ApiRequest, res, url.pathname);
      return;
    }

    await handleStatic(req, res, url.pathname);
  } catch (error) {
    console.error('Request failed:', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end('Internal server error');
    }
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Internal Product Tool listening on port ${PORT}`);
  runEmailDigestScheduler().catch((err) => {
    console.error('[Scheduler] Initialization failed:', err);
  });
});

// Helper to make local POST request to trigger email digest
function triggerLocalDigest(): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/data?action=send-product-ship-digest',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    req.on('error', (err) => reject(err));
    req.write(JSON.stringify({ action: 'send-product-ship-digest' }));
    req.end();
  });
}

// Background scheduler checker daemon (running once every minute)
async function runEmailDigestScheduler() {
  console.log('[Scheduler] Starting automated email digest background scheduler...');
  await connectToDatabase();
  const GlobalSettings = mongoose.models.GlobalSettings || mongoose.model('GlobalSettings');
  
  let lastSentKey = '';

  setInterval(async () => {
    try {
      const now = new Date();
      // Format time and date string in Asia/Kolkata (IST) timezone
      const currentMin = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' });
      const currentDay = now.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' });
      const currentDateStr = now.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
      
      const sentKey = `${currentDateStr} ${currentMin}`;
      if (sentKey === lastSentKey) {
        return; // Checked already in this minute
      }
      lastSentKey = sentKey;

      // Fetch scheduler configurations
      const [freqSetting, timeSetting, daySetting] = await Promise.all([
        GlobalSettings.findOne({ key: 'digestFrequency' }).lean(),
        GlobalSettings.findOne({ key: 'digestTime' }).lean(),
        GlobalSettings.findOne({ key: 'digestDayOfWeek' }).lean()
      ]);

      const frequency = freqSetting?.value || 'weekly';
      const preferredTime = timeSetting?.value || '09:00';
      const preferredDay = daySetting?.value || 'Monday';

      if (currentMin === preferredTime) {
        let shouldSend = false;
        if (frequency === 'everyday') {
          shouldSend = true;
        } else if (frequency === 'weekly' && currentDay === preferredDay) {
          shouldSend = true;
        }

        if (shouldSend) {
          console.log(`[Scheduler] Time match found (${sentKey})! Dispatching automated Product Ship digest...`);
          try {
            const result = await triggerLocalDigest();
            console.log('[Scheduler] Dispatch result:', result);
          } catch (dispatchErr) {
            console.error('[Scheduler] Dispatch request failed:', dispatchErr);
          }
        }
      }
    } catch (err) {
      console.error('[Scheduler] Error checking schedule:', err);
    }
  }, 60000); // Check once every minute
}
