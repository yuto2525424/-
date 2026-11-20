import http from 'node:http';
import Anthropic from '@anthropic-ai/sdk';
import { handleRequest, SessionStore, type AppDeps } from './app';

/**
 * 判定サーバーの起動口。
 * 環境変数：
 *   ANTHROPIC_API_KEY   … 必須（サーバー側だけに置く。アプリには含めない）
 *   PORT                … 既定 8787
 *   ALLOWED_ORIGIN      … 許可するブラウザの接続元（例：https://claude.ai）
 *   AI_CALLS_PER_DAY    … 1日のAI判定回数の上限（既定 300）
 */

const port = Number(process.env.PORT ?? 8787);
const allowedOrigin = process.env.ALLOWED_ORIGIN ?? '*';
const dailyLimit = Number(process.env.AI_CALLS_PER_DAY ?? 300);

const client = new Anthropic(); // ANTHROPIC_API_KEY を環境変数から読む

let dayKey = new Date().toISOString().slice(0, 10);
let callsToday = 0;

const deps: AppDeps = {
  client,
  now: () => Date.now(),
  random: Math.random,
  sessionTtlMs: 2 * 60 * 60 * 1000,
  aiBudgetAvailable: () => {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== dayKey) {
      dayKey = today;
      callsToday = 0;
    }
    return callsToday < dailyLimit;
  },
  onAiCall: () => {
    callsToday += 1;
  },
};

const store = new SessionStore();

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 10_000) {
      res.writeHead(413, { 'Content-Type': 'application/json' }).end('{"error":"too large"}');
      return;
    }
  }
  let body: unknown = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' }).end('{"error":"invalid json"}');
    return;
  }
  const result = await handleRequest(req.method ?? 'GET', (req.url ?? '/').split('?')[0], body, store, deps);
  res.writeHead(result.status, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(result.body));
});

server.listen(port, () => {
  console.log(`MARINK judge server on :${port}`);
});
