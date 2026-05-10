# DeepSeek Chat App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local DeepSeek chat app that shows model reasoning and final answers in separate UI sections.

**Architecture:** A Vite React frontend sends chat turns to an Express backend. The backend owns the DeepSeek API key, calls `https://api.deepseek.com/chat/completions`, enables thinking mode, and normalizes `reasoning_content` plus `content` for the UI.

**Tech Stack:** React, Vite, Express, dotenv, Vitest, React Testing Library, Supertest, native `fetch`.

---

## File Structure

- `package.json`: scripts and dependencies for frontend, backend, tests, and dev server.
- `index.html`: Vite HTML entry.
- `vite.config.js`: React plugin, Vitest jsdom setup, and `/api` dev proxy.
- `src/main.jsx`: frontend entrypoint.
- `src/App.jsx`: chat state, composer, API call, and transcript rendering.
- `src/AssistantMessage.jsx`: assistant response UI with collapsible reasoning.
- `src/styles.css`: responsive app styling.
- `src/test/setup.js`: jest-dom test setup.
- `src/AssistantMessage.test.jsx`: frontend test for collapsible reasoning and final answer rendering.
- `server/deepseekClient.js`: request construction, response parsing, and DeepSeek fetch call.
- `server/deepseekClient.test.js`: tests for model, thinking payload, parsing, missing key, and upstream errors.
- `server/app.js`: Express app factory and `/api/chat` route.
- `server/app.test.js`: API route tests using injected chat client.
- `server/index.js`: local server startup and environment loading.
- `.env.example`: documented environment variables without secrets.
- `.env.local`: untracked local key file.

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

## Task 2: DeepSeek Client

**Files:**
- Create: `server/deepseekClient.test.js`
- Create: `server/deepseekClient.js`

- [ ] **Step 1: Write failing client tests**

The tests assert that `buildDeepSeekRequest()` sends `deepseek-v4-flash`, `thinking.type = enabled`, and `reasoning_effort = high`; `parseDeepSeekResponse()` separates `reasoning_content` and `content`; and `chatWithDeepSeek()` reports missing key and upstream failures clearly.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- server/deepseekClient.test.js`

Expected: FAIL because `server/deepseekClient.js` does not exist.

- [ ] **Step 3: Implement client**

Create exports:

```js
export function buildDeepSeekRequest(messages) {}
export function parseDeepSeekResponse(payload) {}
export async function chatWithDeepSeek(messages, options = {}) {}
```

`chatWithDeepSeek()` posts to `https://api.deepseek.com/chat/completions` with bearer auth, validates `DEEPSEEK_API_KEY`, and returns `{ reasoning, answer, usage }`.

- [ ] **Step 4: Run client tests**

Run: `npm test -- server/deepseekClient.test.js`

Expected: PASS.

- [ ] **Step 5: Commit client**

Run: `git add server/deepseekClient.js server/deepseekClient.test.js && git commit -m "feat: add DeepSeek chat client"`

## Task 3: Express API

**Files:**
- Create: `server/app.test.js`
- Create: `server/app.js`
- Create: `server/index.js`

- [ ] **Step 1: Write failing route tests**

The tests inject a fake `chatWithDeepSeek`, post `{ messages: [{ role: "user", content: "hi" }] }` to `/api/chat`, and expect normalized `{ reasoning, answer }`. They also verify empty messages return 400 and thrown client errors return a JSON error.

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
