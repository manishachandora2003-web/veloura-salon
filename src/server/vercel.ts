import express from 'express';
import { apiRouter, sanitizeErrorMessage } from './api.ts';

const app = express();

app.use(express.json());

// Normalize URL if Vercel rewrite collapsed req.url to /api
app.use((req, res, next) => {
  const matchedPath = (req.headers['x-matched-path'] || req.headers['x-rewrite-url']) as string;
  if (matchedPath && req.url === '/api' && matchedPath.startsWith('/api/')) {
    req.url = matchedPath;
  }
  next();
});

// Support both /api/* and direct routes inside Vercel
app.use('/api', apiRouter);
app.use(apiRouter);

// Global serverless error handler ensuring valid JSON response instead of Function Invocation Failed
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Vercel Serverless Error]:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({
    error: sanitizeErrorMessage(err),
  });
});

export default function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Fatal Exception]:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: sanitizeErrorMessage(err),
      });
    }
  }
}

export { app };

