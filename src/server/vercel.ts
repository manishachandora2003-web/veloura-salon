import express from 'express';
import { apiRouter, sanitizeErrorMessage } from './api.ts';

const app = express();

app.use(express.json());

// Support both /api/* and /* inside Vercel rewrites
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

export default app;
export { app };

