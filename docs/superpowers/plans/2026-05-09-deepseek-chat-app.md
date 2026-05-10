# Hermes Agent Chat App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Hermes Agent chat app that shows agent/model reasoning and final answers in separate UI sections.

**Architecture:** A Vite React frontend sends chat turns to an Express backend. The backend owns the DeepSeek API key, spawns a Python Hermes bridge, and Hermes `AIAgent` uses the DeepSeek provider with `deepseek-v4-flash`. The bridge streams Hermes reasoning and answer callbacks as JSON Lines, and Express forwards them as SSE events.

**Tech Stack:** React, Vite, Express, dotenv, Vitest, React Testing Library, Supertest, Node child processes, Python 3.11, Hermes Agent.

---

## File Structure

- `package.json`: scripts and dependencies for frontend, backend, tests, and dev server.
- `index.html`: Vite HTML entry.
- `vite.config.js`: React plugin, Vitest jsdom setup, and `/api` dev proxy.
- `src/main.jsx`: frontend entrypoint.
- `src/App.jsx`: chat state, composer, streaming API call, and transcript rendering.
- `src/AssistantMessage.jsx`: assistant response UI with collapsible reasoning.
- `src/styles.css`: responsive app styling.
- `src/test/setup.js`: jest-dom test setup.
- `src/AssistantMessage.test.jsx`: frontend test for collapsible reasoning and final answer rendering.
- `server/hermesAgentClient.js`: Node client that spawns the Python Hermes bridge and parses JSON Lines events.
- `server/hermesAgentClient.test.js`: tests for bridge spawning, stream parsing, and aggregation.
- `server/hermes_bridge.py`: Python bridge that imports Hermes `AIAgent` and maps callbacks to JSON Lines.
- `server/app.js`: Express app factory plus `/api/chat` JSON route and `/api/chat/stream` SSE route.
- `server/app.test.js`: API route tests using injected chat clients.
- `server/index.js`: local server startup and environment loading.
- `.env.example`: documented environment variables without secrets.
- `.env.local`: untracked local key file.
- `requirements-hermes.txt`: Python dependency pin for Hermes Agent from the official GitHub repository.

## Task 1: Tooling and Test Skeleton

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.js`
- Create: `src/test/setup.js`
- Create: `.env.example`

- [ ] **Step 1: Add project tooling files**

```json
{
  "type": "module",
  "scripts": {
    "dev": "concurrently \"npm:dev:server\" \"npm:dev:client\"",
    "dev:client": "vite --host 127.0.0.1",
    "dev:server": "node --watch server/index.js",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install @vitejs/plugin-react vite vitest jsdom @testing-library/react @testing-library/jest-dom express dotenv supertest concurrently`

Expected: `package-lock.json` is created and install exits with code 0.

- [ ] **Step 3: Commit tooling**

Run: `git add package.json package-lock.json index.html vite.config.js src/test/setup.js .env.example && git commit -m "chore: scaffold DeepSeek chat app tooling"`

## Task 2: Hermes Agent Client

**Files:**
- Create: `server/hermesAgentClient.test.js`
- Create: `server/hermesAgentClient.js`
- Create: `server/hermes_bridge.py`

- [ ] **Step 1: Write failing client tests**

The tests assert that `streamHermesAgent()` spawns the Python bridge, passes messages as JSON, parses JSON Lines reasoning/answer events, and that `chatWithHermesAgent()` aggregates streamed events for the legacy JSON route.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- server/hermesAgentClient.test.js`

Expected: FAIL because `server/hermesAgentClient.js` does not exist.

- [ ] **Step 3: Implement client**

Create Node exports `buildHermesPayload()`, `streamHermesAgent()`, and `chatWithHermesAgent()`. Create `server/hermes_bridge.py` with `AIAgent(provider="deepseek", model="deepseek-v4-flash", ...)`.

- [ ] **Step 4: Run client tests**

Run: `npm test -- server/hermesAgentClient.test.js`

Expected: PASS.

- [ ] **Step 5: Commit client**

Run: `git add server/hermesAgentClient.js server/hermesAgentClient.test.js server/hermes_bridge.py && git commit -m "feat: add Hermes agent bridge"`

## Task 3: Express API

**Files:**
- Create: `server/app.test.js`
- Create: `server/app.js`
- Create: `server/index.js`

- [ ] **Step 1: Write failing route tests**

The tests inject a fake Hermes chat client, post `{ messages: [{ role: "user", content: "hi" }] }` to `/api/chat`, and expect normalized `{ reasoning, answer }`. They also verify empty messages return 400 and thrown client errors return a JSON error.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- server/app.test.js`

Expected: FAIL because `server/app.js` does not exist.

- [ ] **Step 3: Implement Express app**

Create `createApp({ chatClient })`, mount JSON middleware, validate messages, call the chat client, and return JSON.

- [ ] **Step 4: Run API tests**

Run: `npm test -- server/app.test.js`

Expected: PASS.

- [ ] **Step 5: Commit API**

Run: `git add server/app.js server/app.test.js server/index.js && git commit -m "feat: add chat API route"`

## Task 4: Assistant Message UI

**Files:**
- Create: `src/AssistantMessage.test.jsx`
- Create: `src/AssistantMessage.jsx`

- [ ] **Step 1: Write failing UI tests**

The tests render an assistant message with `reasoning` and `answer`, verify both labels are visible, click the collapse button, and verify the reasoning text is hidden while the final answer remains visible.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/AssistantMessage.test.jsx`

Expected: FAIL because `src/AssistantMessage.jsx` does not exist.

- [ ] **Step 3: Implement assistant message component**

Create a component with local collapsed state, a button with `aria-expanded`, a reasoning panel, and a final answer panel.

- [ ] **Step 4: Run UI tests**

Run: `npm test -- src/AssistantMessage.test.jsx`

Expected: PASS.

- [ ] **Step 5: Commit UI component**

Run: `git add src/AssistantMessage.jsx src/AssistantMessage.test.jsx && git commit -m "feat: add collapsible reasoning message"`

## Task 5: Chat App Integration

**Files:**
- Create: `src/App.jsx`
- Create: `src/main.jsx`
- Create: `src/styles.css`

- [ ] **Step 1: Implement app shell**

Create chat state, submit handling, loading and error states, and render user messages plus `AssistantMessage` responses.

- [ ] **Step 2: Build app**

Run: `npm run build`

Expected: PASS with Vite production build output in `dist/`.

- [ ] **Step 3: Run full tests**

Run: `npm test`

Expected: PASS for server and frontend tests.

- [ ] **Step 4: Commit app integration**

Run: `git add src/App.jsx src/main.jsx src/styles.css && git commit -m "feat: build DeepSeek chat interface"`

## Task 6: Local Configuration and Verification

**Files:**
- Create: `.env.local` (untracked)

- [ ] **Step 1: Add local API key**

Create `.env.local` with `DEEPSEEK_API_KEY` and verify `git status --short` does not show it.

- [ ] **Step 2: Run verification**

Run: `npm test && npm run build`

Expected: both commands exit with code 0.

- [ ] **Step 3: Start local dev server**

Run: `npm run dev`

Expected: Express listens on `http://127.0.0.1:3001` and Vite serves the app on `http://127.0.0.1:5173`.

## Task 7: Streaming Hermes Agent Client

**Files:**
- Modify: `server/hermesAgentClient.test.js`
- Modify: `server/hermesAgentClient.js`
- Modify: `server/hermes_bridge.py`

- [ ] **Step 1: Write failing streaming client tests**

Add tests for bridge JSON Lines streaming. The fake Python bridge output must emit:

```js
[
  { type: 'reasoning', delta: '先想' },
  { type: 'answer', delta: '答案' }
]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- server/hermesAgentClient.test.js`

Expected: FAIL because the Hermes streaming client exports do not exist.

- [ ] **Step 3: Implement streaming client helpers**

Wire `streamHermesAgent()` as the default Express stream client and make `server/hermes_bridge.py` call `AIAgent.run_conversation(..., stream_callback=on_answer)`.

- [ ] **Step 4: Run streaming client tests**

Run: `npm test -- server/hermesAgentClient.test.js`

Expected: PASS.

## Task 8: Streaming API Route

**Files:**
- Modify: `server/app.test.js`
- Modify: `server/app.js`

- [ ] **Step 1: Write failing route tests**

Add a route test that injects `streamClient` returning an async iterable with reasoning and answer deltas, posts to `/api/chat/stream`, and expects `text/event-stream` data lines containing normalized JSON events and a final `done` event.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- server/app.test.js`

Expected: FAIL because `/api/chat/stream` does not exist.

- [ ] **Step 3: Implement streaming route**

Add `/api/chat/stream`, set SSE headers, validate messages, write each normalized event as `data: <json>\n\n`, then write `data: {"type":"done"}\n\n` before ending.

- [ ] **Step 4: Run route tests**

Run: `npm test -- server/app.test.js`

Expected: PASS.

## Task 9: Frontend Incremental Rendering

**Files:**
- Modify: `src/App.test.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Write failing frontend streaming test**

Mock `fetch()` to return a `ReadableStream` that sends multiple SSE data events. The test must verify that the app calls `/api/chat/stream` and renders the accumulated reasoning and answer text separately.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/App.test.jsx`

Expected: FAIL because the app still calls `/api/chat` and waits for JSON.

- [ ] **Step 3: Implement frontend stream reader**

Read `response.body.getReader()`, decode SSE chunks, append `reasoning` deltas to the in-progress assistant message's `reasoning`, append `answer` deltas to `answer`, and stop on `done`.

- [ ] **Step 4: Run frontend tests**

Run: `npm test -- src/App.test.jsx`

Expected: PASS.

## Task 10: Streaming Verification

**Files:**
- Modify: `docs/superpowers/specs/2026-05-09-deepseek-chat-app-design.md`
- Modify: `docs/superpowers/plans/2026-05-09-deepseek-chat-app.md`

- [ ] **Step 1: Run full verification**

Run: `npm test && npm run build`

Expected: both commands exit with code 0.

- [ ] **Step 2: Run local streaming smoke test**

Run a short POST to `http://127.0.0.1:3001/api/chat/stream` and verify the response contains at least one `reasoning` or `answer` SSE event plus `done`.
