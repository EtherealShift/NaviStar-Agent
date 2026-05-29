# NaviStar-Agent 架构文档

> 本文按当前代码状态整理，不把注释代码或规划能力写成已上线事实。

最后更新：2026-05-29

## 总览

```text
React/Electron
    |
    | HTTP + SSE
    v
FastAPI (`src/main.py`)
    |
    +-- `/ai/*` chat API
    +-- `/settings/*` settings API
    |
    v
app/service
    |
    +-- `agent_service.py` 组装 LLM、middleware、checkpoint、SSE
    +-- `settings_service.py` 读写 supplier.yaml / .env
    |
    v
LangChain create_agent + LangGraph checkpoint
    |
    v
SQLite (`src/resources/db/navistar.db`)
```

## 目录分层

```text
src/
├── main.py
├── agent/
│   ├── runner.py
│   ├── memory/memory.py
│   ├── middlewares/middleware.py
│   ├── prompys/system_prompt.py
│   └── tools/tools.py
├── app/
│   ├── api/v1/agent.py
│   ├── api/v1/settings.py
│   ├── service/agent_service.py
│   ├── service/settings_service.py
│   ├── middlewares/middleware.py
│   ├── database/conversatuon_db.py
│   ├── models/
│   └── tools/
├── common/
│   ├── config/
│   ├── models/
│   └── utils/
└── resources/
```

## 后端入口

`src/main.py` 创建 FastAPI 应用：

- 注册 CORS。
- 注册 `agentRouter` 到 `/ai`。
- 注册 `settingsRouter` 到 `/settings`。
- lifespan 中初始化 loguru 与数据库表。

当前文件没有 `uvicorn.run()` 或 `if __name__ == "__main__"` 启动逻辑。本地运行建议：

```bash
uv run uvicorn main:app --app-dir src --host 127.0.0.1 --port 8000
```

## 对话链路

`POST /ai/chat/send/stream` 调用 `app.service.agent_service.chat_stream()`：

1. 从请求读取 `model_name`、`supplier`、`thinking`、`thread_id`、`attachments`。
2. 从 `src/resources/supplier.yaml` 读取 `temperature` 与 `reasoning_effort`。
3. 按 `supplier` 创建模型：
   - `deepseek` → `ChatDeepSeek`
   - `openai` → `ChatOpenAI`
   - `xiaomi` → `ChatOpenAI` + `MIMO_BASE_URL`
4. 创建 `SummarizationMiddleware`。
5. 追加 `save_conversation_middleware`。
6. 创建 LangGraph SQLite checkpointer。
7. 调用 `create_agent(..., tools=[])`。
8. 用 `agent.astream_events(..., version="v2")` 转成 SSE：
   - `{"type":"text","content":...}`
   - `{"type":"thinking","content":...}`
   - `data: [DONE]`

## 消息与持久化

`app/middlewares/middleware.py` 使用 `@after_agent`：

- 定位最近一条 `HumanMessage`。
- 提取本轮 Human / AI / AI_Thinking / Tool 消息。
- 生成会话标题。
- 调用 `save_conversation()` 写入业务表。

业务表：

```text
conversation
├── thread_id PK
├── title
├── created_at
└── updated_at

messages_group
├── id PK
└── thread_id

message_content
├── id PK
├── thread_id
├── group_id
├── role
├── content
├── msg_order
├── meta_data JSON text
└── created_at
```

查询历史时，`Tool` 消息被过滤，不返回给前端。

## 设置系统

`app/api/v1/settings.py` 当前路由：

| 方法 | 路径 | 服务函数 | 作用 |
|------|------|----------|------|
| `GET` | `/settings/get_settings` | `get_settings()` | 读取 `supplier.yaml` |
| `POST` | `/settings/update_settings` | `update_settings()` | 更新 `supplier.yaml` 中的模型设置 |
| `GET` | `/settings/get_model_key` | `update_env_key()` | 写入 `{SUPPLIER}_API_KEY` 到 `.env` |

注意：`get_model_key` 名称与实际行为不一致，实际是更新 key。

## 工具系统现状

`src/agent/tools/tools.py` 已定义：

- `get_geocode`
- `get_weather`
- `get_location_by_ip`
- `web_search_text`
- `douyin_fetch_video_detail`
- `douyin_fetch_video_list`
- `install_tools()`
- `get_network_tools()`

但主对话链路中：

```python
create_agent(..., tools=[])
```

所以这些工具当前未被普通聊天 Agent 使用。

## MCP 与 Office

当前文件状态：

- `app/tools/mcp_tools.py`：MCP 加载代码注释，仅保留占位。
- `app/tools/office_tools.py`：Excel CRUD 工具代码整体注释。
- `src/resources/mcp_tools.json`：配置文件存在。

这些模块可作为后续恢复点，但当前不是上线能力。

## 前端架构

`desktop/src/api/navistarApi.js` 负责所有 HTTP/SSE 调用：

- `fetchConversations()`
- `fetchMessages()`
- `deleteConversation()`
- `fetchModelList()`
- `fetchSettings()`
- `saveSettings()`
- `streamChatMessage()`

`streamChatMessage()` 解析 SSE，并把 `text`、`thinking`、`file` 分发给 React 状态。

当前接口差异：

- 前端基础设置接口已请求 `/settings/get_settings` 与 `/settings/update_settings`。
- 文件上传、技能、MCP、知识库入口只展示待补接口，不主动请求未实现路由。

## Electron 链路

`desktop/electron/main.cjs`：

- 开发模式读取 `NAVISTAR_DESKTOP_DEV_URL`，默认 `http://127.0.0.1:5173`。
- API 地址读取 `NAVISTAR_API_BASE_URL`，默认 `http://127.0.0.1:8000`。
- 通过 preload 暴露 `window.navistar.getApiBaseUrl()`。
- 通过 preload 暴露 `window.navistar.openExternal()`，聊天 Markdown 外链用系统浏览器打开。

注意：生产模式启动后端与端口发现还未补齐。

## 已知技术债

- 后端启动方式与 Electron 生产启动契约未完全闭合。
- 工具、文件、MCP、知识库路由未实现，新桌面端仅保留接口文档与 UI 入口。
- `chat_model_list()` 构建了模型列表，但返回 `Result(data="")`。
- `settings_service.update_env_key()` 返回 `Result`，路由又包一层 `Result(data=...)`。
- 模型供应商名称不统一：`agent_service.py` 判断 `xiaomi`，`runner.py` 判断 `mimo`。
- 附件处理只读取本地路径，并且 plaintext 判断条件疑似写错：`if mime.file_path == "plaintext"`。
- 文件名 `conversatuon_db.py` 拼写错误，但已被多处引用，重命名前需全局替换。
