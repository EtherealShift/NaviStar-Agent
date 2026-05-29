# NaviStar Desktop 前后端接口设计

最后更新：2026-05-29

## 前端位置

新桌面端代码位于 `desktop/`，使用 Electron Forge + Vite + React + Tailwind。

旧 `web/` 目录不再使用，已删除。

## 当前前端已接入

Base URL 默认：`http://127.0.0.1:8000`

Electron 可通过环境变量覆盖：

```bash
NAVISTAR_API_BASE_URL=http://127.0.0.1:8000
```

| 能力 | 方法 | 路径 | 状态 |
|------|------|------|------|
| 会话列表 | `GET` | `/ai/chat/query_list` | 已接入 |
| 会话消息 | `POST` | `/ai/chat/query` | 已接入 |
| 删除会话 | `POST` | `/ai/chat/del` | 已接入 |
| 流式聊天 | `POST` | `/ai/chat/send/stream` | 已接入 |
| 读取配置 | `GET` | `/settings/get_settings` | 已接入 |
| 保存配置 | `POST` | `/settings/update_settings` | 已接入 |
| 模型列表 | `POST` | `/ai/chat/model_list` | 已接入，但后端当前 `data` 为空 |

## 已接入数据契约

### `GET /ai/chat/query_list`

```json
{
  "code": 200,
  "msg": "Chat conversation list query succeeded.",
  "data": [
    {
      "thread_id": "desktop_1780000000000_ab12cd",
      "title": "总结当前项目架构",
      "created_at": "2026-05-29T16:00:00",
      "updated_at": "2026-05-29T16:01:00"
    }
  ]
}
```

### `POST /ai/chat/query`

请求：

```json
{
  "thread_id": "desktop_1780000000000_ab12cd"
}
```

响应：

```json
{
  "code": 200,
  "msg": "success",
  "data": [
    {
      "thread_id": "desktop_1780000000000_ab12cd",
      "group_id": 1,
      "role": "Human",
      "content": "你好",
      "msg_order": 1,
      "created_at": "2026-05-29T16:00:00",
      "meta_data": {}
    },
    {
      "thread_id": "desktop_1780000000000_ab12cd",
      "group_id": 1,
      "role": "AI",
      "content": "你好，我是小星。",
      "msg_order": 2,
      "created_at": "2026-05-29T16:00:01",
      "meta_data": {}
    }
  ]
}
```

`role` 建议枚举：`Human`、`AI`、`AI_Thinking`、`Tool`。当前前端过滤显示由后端决定。

### `POST /ai/chat/send/stream`

请求：

```json
{
  "model_name": "deepseek_v4_pro",
  "human_message": "你好",
  "thinking": true,
  "thread_id": "desktop_1780000000000_ab12cd",
  "supplier": "deepseek",
  "attachments": []
}
```

SSE 响应：

```text
data: {"type":"thinking","content":"分析用户意图..."}

data: {"type":"text","content":"你好"}

data: [DONE]
```

错误建议：

```text
data: {"error":"模型调用失败"}
```

## P0 建议补齐

### 模型列表

当前 `/ai/chat/model_list` 构造了列表，但返回 `Result(data="")`。

建议响应：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "deepseek": ["deepseek_v4_flash", "deepseek_v4_pro"],
    "openai": ["gpt-5.1", "gpt-5.1-mini"],
    "xiaomi": ["xiaomi-v2.5", "xiaomi-v2.5-pro"],
    "one_api": []
  }
}
```

### API Key 保存

建议新增：

`POST /settings/update_model_key`

请求：

```json
{
  "supplier": "deepseek",
  "api_key": "sk-..."
}
```

映射：

| supplier | env key |
|----------|---------|
| `deepseek` | `DEEPSEEK_API_KEY` |
| `openai` | `OPENAI_API_KEY` |
| `xiaomi` | `MIMO_API_KEY` |
| `one_api` | `ONE_API_KEY` |

响应：

```json
{
  "code": 200,
  "msg": "success",
  "data": null
}
```

旧接口 `/settings/get_model_key` 建议废弃或改名，因为当前名字像读取，行为却是写入。

### 单轮聊天覆盖参数

建议扩展 `AgentReq`：

```python
reasoning_effort: str | None = None
temperature: float | None = None
is_network: bool = False
tool_profile: str | None = None
```

前端用途：

| 字段 | UI |
|------|----|
| `reasoning_effort` | 输入框/右侧配置的思考深度 |
| `temperature` | 右侧温度滑块 |
| `is_network` | 输入框联网开关 |
| `tool_profile` | 工具组选择，如 `basic`、`office`、`research` |

## P1 工具与事件

### 技能/工具目录

`GET /ai/skills?include_mcp=true`

响应：

```json
{
  "code": 200,
  "msg": "success",
  "data": [
    {
      "id": "weather",
      "name": "天气",
      "description": "查询天气与地理编码",
      "enabled": true,
      "source": "builtin",
      "tools": ["get_weather", "get_geocode"]
    },
    {
      "id": "mcp_browser",
      "name": "浏览器 MCP",
      "description": "外部 MCP 服务",
      "enabled": false,
      "source": "mcp",
      "tools": []
    }
  ]
}
```

### 工具调用流事件

建议在 SSE 增加：

```text
data: {"type":"tool_start","tool_name":"get_weather","args":{"city":"上海"}}

data: {"type":"tool_end","tool_name":"get_weather","status":"success","elapsed_ms":320,"content":"..."}

data: {"type":"tool_error","tool_name":"get_weather","error":"..."}
```

前端可在右侧“工具审计”面板展示。

## P2 文件能力

### 上传文件

`POST /ai/files/upload`

Content-Type：`multipart/form-data`

字段：`files`

响应：

```json
{
  "code": 200,
  "msg": "文件上传成功",
  "data": {
    "files": [
      {
        "file_id": "uuid",
        "name": "demo.png",
        "size": 1024,
        "content_type": "image/png",
        "extension": ".png",
        "local_path": "D:/.../src/resources/uploads/uuid.png",
        "download_url": "/ai/files/uuid/download"
      }
    ]
  }
}
```

发送聊天时，前端把 `local_path` 放入 `attachments`。

### 下载文件

`GET /ai/files/{file_id}/download`

返回 `FileResponse`。

### 文件列表

建议新增：

`GET /ai/files?thread_id=desktop_...`

响应：

```json
{
  "code": 200,
  "msg": "success",
  "data": [
    {
      "file_id": "uuid",
      "thread_id": "desktop_1780000000000_ab12cd",
      "name": "report.xlsx",
      "direction": "uploaded",
      "size": 2048,
      "content_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "download_url": "/ai/files/uuid/download",
      "created_at": "2026-05-29T16:00:00"
    }
  ]
}
```

## P3 MCP 控制台

### MCP 状态

`GET /ai/mcp/status`

响应：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "servers": [
      {
        "id": "filesystem",
        "name": "filesystem",
        "transport": "stdio",
        "status": "connected",
        "tool_count": 8,
        "last_error": null
      }
    ]
  }
}
```

### 保存 MCP 配置

`POST /ai/mcp/config`

请求：

```json
{
  "servers": [
    {
      "id": "filesystem",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "D:/work"],
      "enabled": true
    }
  ]
}
```

## P4 知识库/RAG

### 创建知识库

`POST /ai/knowledge/bases`

```json
{
  "name": "项目文档",
  "description": "NaviStar 本地研发资料"
}
```

### 文档入库

`POST /ai/knowledge/documents`

```json
{
  "base_id": "kb_uuid",
  "file_ids": ["file_uuid"],
  "chunk_size": 800,
  "chunk_overlap": 120
}
```

### 检索

`POST /ai/knowledge/search`

```json
{
  "base_id": "kb_uuid",
  "query": "后端启动契约",
  "top_k": 5
}
```

响应：

```json
{
  "code": 200,
  "msg": "success",
  "data": [
    {
      "document_id": "doc_uuid",
      "title": "ARCHITECTURE.md",
      "score": 0.82,
      "chunk": "后端入口 src/main.py 创建 FastAPI 应用...",
      "metadata": {
        "line_start": 12
      }
    }
  ]
}
```

## 桌面端外链

前端 Markdown 中 `http/https` 链接通过 Electron IPC 调用系统浏览器打开，后端无需处理。
