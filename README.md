# Music Agent

一个基于 Hermes Agent + DeepSeek 的音乐领域意图路由聊天应用。前端展示两块内容：

- 思考过程：实时流式展示，可折叠。
- 最后答案：生成时可以流式展示，收到完整 JSON 后会一次性替换为格式化结构化结果。

非闲聊请求会输出意图和要调用的 skill。闲聊请求会直接自然回复。

## 功能概览

- 使用 Hermes `AIAgent` 作为 agent 层。
- Hermes 配置 DeepSeek OpenAI-compatible API，默认模型为 `deepseek-v4-flash`。
- 后端保存 API key，不会暴露给浏览器。
- 支持 SSE 流式接口 `/api/chat/stream`。
- 音乐路由模式默认开启：`HERMES_AGENT_MODE=music_router`。
- 对非闲聊音乐请求输出结构化 JSON：
  - `精准搜索` -> `music_search`
  - `推荐` -> `music_recommend`
  - `随机推荐` -> `random_recommend`
  - `AI搜索` -> `ai_search`
  - `操控` -> `app_control`
  - `资产查询` -> `asset_query`
  - `榜单` -> `chart_query`
  - `任务编排` -> `task_plan`

## 前置环境

需要先安装：

- Git
- Node.js 18 或更高版本
- npm
- Python 3.11 或更高版本
- DeepSeek API Key

Python 依赖会从 `requirements-hermes.txt` 安装，其中 Hermes Agent 通过 GitHub 源码依赖安装，所以本机需要能访问 GitHub。

## 安装

```bash
git clone git@github.com:hellen9527/music_agent.git
cd music_agent

npm install

python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-hermes.txt
```

如果你不想使用项目根目录下的 `.venv`，需要在环境变量里设置 `HERMES_PYTHON` 指向可运行 Hermes 的 Python 路径。

## 配置

复制示例配置：

```bash
cp .env.example .env.local
```

然后编辑 `.env.local`：

```bash
DEEPSEEK_API_KEY=replace-with-your-deepseek-api-key
PORT=3001
HERMES_MODEL=deepseek-v4-flash
HERMES_PROVIDER=deepseek
HERMES_BASE_URL=https://api.deepseek.com/v1
HERMES_AGENT_MODE=music_router
HERMES_REASONING_EFFORT=high
HERMES_MAX_ITERATIONS=10
HERMES_DISABLED_TOOLSETS=terminal,browser
```

说明：

- `DEEPSEEK_API_KEY`：你的 DeepSeek API Key，只写在本地 `.env.local`。
- `PORT`：Express 后端端口，默认 `3001`。
- `HERMES_MODEL`：Hermes 调用的模型，默认 `deepseek-v4-flash`。
- `HERMES_AGENT_MODE`：默认 `music_router`，启用音乐意图路由 prompt。
- `HERMES_DISABLED_TOOLSETS`：默认禁用 `terminal,browser`。

安全注意：

- `.env` 和 `.env.*` 都已被 `.gitignore` 忽略。
- 仓库只提交 `.env.example`，不要提交 `.env.local` 或任何真实 API key。
- 如果真实 key 曾经被提交到远端，请立即在 DeepSeek 控制台作废并重新生成。

## 启动开发环境

```bash
npm run dev
```

启动后：

- 前端：`http://127.0.0.1:5173`
- 后端：`http://127.0.0.1:3001`

也可以分开启动：

```bash
npm run dev:server
npm run dev:client
```

## 测试和构建

运行全部测试：

```bash
npm test
```

构建前端：

```bash
npm run build
```

检查 Python bridge 语法：

```bash
.venv/bin/python -m py_compile server/hermes_bridge.py
```

单独运行 Hermes bridge 的 Python 单测：

```bash
.venv/bin/python -m unittest server.hermes_bridge_test
```

## API

### `POST /api/chat/stream`

SSE 流式聊天接口。

请求：

```json
{
  "messages": [
    { "role": "user", "content": "想找点台湾歌手的新歌来听" }
  ]
}
```

响应事件：

```json
{ "type": "reasoning", "delta": "..." }
{ "type": "answer", "delta": "..." }
{ "type": "done" }
```

如果发生错误：

```json
{ "type": "error", "error": "..." }
```

### `POST /api/chat`

非流式兼容接口，返回聚合后的：

```json
{
  "reasoning": "...",
  "answer": "..."
}
```

## 音乐路由示例

普通推荐，不需要联网：

```text
适合下雨天通勤的粤语歌
```

可能输出：

```json
{
  "type": "skill_call",
  "intent": "推荐",
  "skill": "music_recommend",
  "args": {
    "keywords": ["下雨天 通勤 粤语歌"]
  }
}
```

如果用户否定上一轮推荐结果，需要保留上一轮推荐条件换一批，不要直接变成随机推荐：

```text
这些不好听
```

假设上一轮推荐条件是 `无聊时候听的歌`，应该输出：

```json
{
  "type": "skill_call",
  "intent": "推荐",
  "skill": "music_recommend",
  "args": {
    "keywords": ["无聊时候听的歌"],
    "feedback": "上一批不好听，保持条件换一批"
  }
}
```

最近/热门/新歌这类语义上能用榜单解决的请求，不需要用户完整说出榜单名：

```text
最近有什么好听的歌
```

应该先拉相关榜单，再按需要获取榜单返回歌曲的信息：

```json
{
  "type": "task_plan",
  "intent": "任务编排",
  "steps": [
    {
      "intent": "榜单",
      "skill": "chart_query",
      "args": {
        "chart": "新歌榜"
      }
    },
    {
      "intent": "榜单",
      "skill": "chart_query",
      "args": {
        "chart": "抖音热搜榜"
      }
    },
    {
      "intent": "精准搜索",
      "skill": "music_search",
      "args": {
        "keywords": ["榜单返回的歌曲名"]
      }
    }
  ]
}
```

需要实体解析和时效搜索：

```text
想找点台湾歌手的新歌来听
```

应该输出任务编排，先 `ai_search` 再 `music_search`：

```json
{
  "type": "task_plan",
  "intent": "任务编排",
  "steps": [
    {
      "intent": "AI搜索",
      "skill": "ai_search",
      "args": {
        "keywords": ["台湾歌手 代表歌手 近期新歌"]
      }
    },
    {
      "intent": "精准搜索",
      "skill": "music_search",
      "args": {
        "keywords": ["AI搜索返回的歌手名和新歌名"]
      }
    }
  ]
}
```

## 项目目录结构

```text
.
├── src/
│   ├── App.jsx
│   ├── AssistantMessage.jsx
│   ├── main.jsx
│   ├── styles.css
│   └── test/
├── server/
│   ├── app.js
│   ├── index.js
│   ├── hermesAgentClient.js
│   └── hermes_bridge.py
├── docs/
│   └── superpowers/
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── requirements-hermes.txt
└── vite.config.js
```

目录说明：

- `src/`：React 前端代码。
- `src/App.jsx`：聊天状态、SSE 读取、最终 JSON 格式化替换。
- `src/AssistantMessage.jsx`：思考过程和最后答案的展示组件，思考过程可折叠。
- `src/styles.css`：页面样式。
- `server/`：Express 后端和 Hermes bridge。
- `server/app.js`：API 路由，包括 `/api/chat` 和 `/api/chat/stream`。
- `server/index.js`：本地后端启动入口，会读取 `.env.local`。
- `server/hermesAgentClient.js`：Node 侧 Hermes 客户端，负责启动 Python bridge 并解析 JSON Lines。
- `server/hermes_bridge.py`：Python 侧 Hermes Agent bridge，配置 DeepSeek 和音乐路由 prompt。
- `docs/superpowers/`：设计和实现计划文档。
- `.env.example`：配置模板，不包含真实密钥。
- `requirements-hermes.txt`：Python Hermes Agent 依赖。
- `vite.config.js`：Vite、React、Vitest 和 `/api` 代理配置。

## 常见问题

### 启动后提示找不到 Python

默认后端会使用：

```text
.venv/bin/python
```

请确认已经创建 `.venv` 并安装依赖。或者设置：

```bash
HERMES_PYTHON=/path/to/python npm run dev
```

### DeepSeek 请求失败

检查：

- `.env.local` 是否存在。
- `DEEPSEEK_API_KEY` 是否有效。
- `HERMES_BASE_URL` 是否为 `https://api.deepseek.com/v1`。
- 本机网络是否能访问 DeepSeek API。

### 页面能打开但没有思考过程

确认当前模型和 API 支持 thinking/reasoning 输出，并且 `.env.local` 中保留：

```bash
HERMES_REASONING_EFFORT=high
```
