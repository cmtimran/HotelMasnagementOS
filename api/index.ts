import type { IncomingMessage, ServerResponse } from 'http';
import app from '../server/src/server.js';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    // If Vercel internal router rewrote req.url to /api/index, restore original path from x-matched-path
    const matchedPath = (req.headers as any)?.['x-matched-path'];
    if (typeof matchedPath === 'string' && matchedPath.startsWith('/api') && req.url !== matchedPath) {
      const urlParts = (req.url || '').split('?');
      const query = urlParts[1] ? `?${urlParts[1]}` : '';
      req.url = `${matchedPath}${query}`;
    }

    return (app as any)(req, res);
  } catch (err: any) {
    console.error('🚨 [Vercel Serverless Function Error]:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        error: 'Internal Server Error in Vercel Function handler',
        message: err?.message || String(err),
      }));
    }
  }
}
