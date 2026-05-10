import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_BRIDGE_PATH = path.join(__dirname, 'hermes_bridge.py');

function defaultPythonPath() {
  return process.env.HERMES_PYTHON || path.join(process.cwd(), '.venv', 'bin', 'python');
}

export function buildHermesPayload(messages) {
  return { messages };
}

export async function* streamHermesAgent(messages, options = {}) {
  const {
    spawnImpl = spawn,
    pythonPath = defaultPythonPath(),
    bridgePath = DEFAULT_BRIDGE_PATH,
    env = process.env
  } = options;
  const child = spawnImpl(pythonPath, [bridgePath], {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: ['pipe', 'pipe', 'pipe']
  });
  let stderr = '';

  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  const closed = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error((stderr || `Hermes bridge exited with code ${code}`).trim()));
    });
  });

  child.stdin.end(`${JSON.stringify(buildHermesPayload(messages))}\n`);

  const lines = createInterface({
    input: child.stdout,
    crlfDelay: Infinity
  });

  for await (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    const event = JSON.parse(line);
    if (event.type === 'error') {
      throw new Error(event.error || 'Hermes agent request failed');
    }
    if (event.type !== 'done') {
      yield event;
    }
  }

  await closed;
}

export async function chatWithHermesAgent(messages, options = {}) {
  const streamClient = options.streamClient || streamHermesAgent;
  let reasoning = '';
  let answer = '';

  for await (const event of streamClient(messages, options)) {
    if (event.type === 'reasoning') {
      reasoning += event.delta;
    }
    if (event.type === 'answer') {
      answer += event.delta;
    }
  }

  return { reasoning, answer };
}
