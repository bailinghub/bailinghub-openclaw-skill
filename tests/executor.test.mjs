import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const runner = join(root, 'skills', 'bailinghub-executor', 'scripts', 'bailinghub-openclaw-executor.mjs');

function run(env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [runner], {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('Runner test timed out'));
    }, 12_000);
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

test('claims one task, runs OpenClaw, strips credentials, and reports the claim token', async (t) => {
  const temp = await mkdtemp(join(tmpdir(), 'bailinghub-openclaw-test-'));
  t.after(async () => rm(temp, { recursive: true, force: true }));

  const fakeOpenClaw = join(temp, 'fake-openclaw.mjs');
  await writeFile(fakeOpenClaw, `#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
const args = process.argv.slice(2);
const index = args.indexOf('--message-file');
const message = await readFile(args[index + 1], 'utf8');
process.stdout.write(JSON.stringify({ payloads: [{ text: JSON.stringify({
  message,
  leakedExecutorToken: Boolean(process.env.BAILING_EXECUTOR_TOKEN),
  leakedToolToken: Boolean(process.env.BAILING_TOOL_TOKEN),
  jobId: process.env.BAILING_JOB_ID
}) }] }));
`, 'utf8');
  await chmod(fakeOpenClaw, 0o755);

  const requests = [];
  let claimCount = 0;
  let resultBody;
  const server = createServer(async (request, response) => {
    const body = await readJson(request);
    requests.push({ url: request.url, authorization: request.headers.authorization, body });
    response.setHeader('content-type', 'application/json');

    if (request.url === '/executor/claim') {
      claimCount += 1;
      response.end(JSON.stringify({
        job: claimCount === 1 ? {
          job_id: 'job-1',
          request_id: 'request-1',
          target: 'finance-agent',
          input: 'Summarize the approved refund request.',
          claim_token: 'claim-token-1',
          session: { sessionId: 'session-1', isContinue: false },
          tools: { tool_token: 'must-not-leak', defs: [{ name: 'refund' }] },
        } : null,
      }));
      return;
    }
    if (request.url === '/executor/result') {
      resultBody = body;
      response.end('{}');
      return;
    }
    if (request.url === '/executor/heartbeat') {
      response.end('{}');
      return;
    }
    response.statusCode = 404;
    response.end('{}');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const address = server.address();

  const token = 'test-executor-token-that-must-not-leak';
  const outcome = await run({
    BAILING_HUB_URL: `http://127.0.0.1:${address.port}`,
    BAILING_EXECUTOR_TOKEN: token,
    BAILING_TARGET: 'finance-agent',
    BAILING_EXECUTOR_ID: 'test-openclaw-executor',
    BAILING_RUN_ONCE: '1',
    OPENCLAW_BIN: fakeOpenClaw,
    OPENCLAW_TIMEOUT_SECONDS: '10',
    BAILING_TOOL_TOKEN: 'parent-tool-token-that-must-not-leak',
  });

  assert.equal(outcome.code, 0, outcome.stderr);
  assert.ok(resultBody, 'Runner did not report a result');
  assert.equal(resultBody.job_id, 'job-1');
  assert.equal(resultBody.claim_token, 'claim-token-1');
  assert.equal(resultBody.ok, true);

  const openClawResult = JSON.parse(resultBody.output.text);
  assert.equal(openClawResult.message, 'Summarize the approved refund request.');
  assert.equal(openClawResult.leakedExecutorToken, false);
  assert.equal(openClawResult.leakedToolToken, false);
  assert.equal(openClawResult.jobId, 'job-1');
  assert.ok(requests.every((item) => item.authorization === `Bearer ${token}`));
  assert.equal(requests[0].body.capabilities.runtime, 'openclaw');
  assert.equal(outcome.stdout.includes(token), false);
  assert.equal(outcome.stderr.includes(token), false);
});

test('fails closed when a non-loopback hub uses plain HTTP', async () => {
  const outcome = await run({
    BAILING_HUB_URL: 'http://example.com',
    BAILING_EXECUTOR_TOKEN: 'token',
    BAILING_TARGET: 'target',
  });
  assert.equal(outcome.code, 2);
  assert.match(outcome.stderr, /must use HTTPS/);
});

test('fails closed when the executor token is missing', async () => {
  const childEnv = { ...process.env };
  delete childEnv.BAILING_EXECUTOR_TOKEN;
  const outcome = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [runner], {
      env: {
        ...childEnv,
        BAILING_HUB_URL: 'https://hub.example.com',
        BAILING_TARGET: 'target',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stderr }));
  });
  assert.equal(outcome.code, 2);
  assert.match(outcome.stderr, /BAILING_EXECUTOR_TOKEN/);
});

