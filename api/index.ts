import express, { Request, Response } from 'express';
import { apiRouter } from '../src/server/api.ts';

const app = express();

app.use(express.json());

// Support both /api/* and /* inside Vercel rewrites
app.use('/api', apiRouter);
app.use(apiRouter);

export default app;
