# NaviStar Desktop 后端接口契约

最后更新：2026-05-29

本文只记录新版 `desktop/` 前端需要、但当前后端未完整实现的接口。后端代码本次未改动。

## 已实现并接入

| 能力 | 方法 | 路径 |
|------|------|------|
| 会话列表 | `GET` | `/ai/chat/query_list` |
| 会话消息 | `POST` | `/ai/chat/query` |
| 删除会话 | `POST` | `/ai/chat/del` |
| 流式聊天 | `POST` | `/ai/chat/send/stream` |
| 读取模型设置 | `GET` | `/settings/get_settings` |
| 保存模型设置 | `POST` | `/settings/update_settings` |

## P0：模型列表

当前 `POST /ai/chat/model_list` 构造了模型列表，但返回 `Result(data="")`。

建议返回：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "deepseek": ["deepseek_v4_flash", "deepseek_v4_pro"],
    "openai": ["gpt-5.1", "gpt-5.1-mini"],
    "xiaomi": ["xiaomi-v2.5", "xiaomi-v2.5-pro"]
  }
}
```

## P0：API Key 保存

新增：

```http
POST /settings/update_model_key
Content-Type: application/json
```

请求：

```json
{
  "supplier": "deepseek",
  "api_key": "sk-..."
}
```

响应：

```json
{
  "code": 200,
  "msg": "success",
  "data": null
}
```

供应商映射：

| supplier | env key |
|----------|---------|
| `deepseek` | `DEEPSEEK_API_KEY` |
| `openai` | `OPENAI_API_KEY` |
| `xiaomi` | `MIMO_API_KEY` |
| `one_api` | `ONE_API_KEY` |

当前 `/settings/get_model_key` 名称像读取，实际会写入 `.env`，建议废弃或重命名。

## P1：单轮聊天覆盖参数

扩展 `AgentReq`：

```python
reasoning_effort: str | None = None
temperature: float | None = None
is_network: bool = False
tool_profile: str | None = None
```

前端用途：

| 字段 | UI |
|------|----|
| `reasoning_effort` | 右侧思考深度 |
| `temperature` | 右侧温度滑块 |
| `is_network` | 输入区联网开关 |
| `tool_profile` | 工具组选择 |

## P1：工具目录

```http
GET /ai/skills?include_mcp=true
```

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
    }
  ]
}
```

## P1：工具流事件

在 `/ai/chat/send/stream` SSE 中增加：

```text
data: {"type":"tool_start","tool_name":"get_weather","args":{"city":"上海"}}

data: {"type":"tool_end","tool_name":"get_weather","status":"success","elapsed_ms":320,"content":"..."}

data: {"type":"tool_error","tool_name":"get_weather","error":"..."}
```

## P2：文件上传与下载

上传：

```http
POST /ai/files/upload
Content-Type: multipart/form-data
```

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

下载：

```http
GET /ai/files/{file_id}/download
```

文件列表：

```http
GET /ai/files?thread_id=desktop_...
```

## P3：MCP 控制台

状态：

```http
GET /ai/mcp/status
```

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

保存配置：

```http
POST /ai/mcp/config
Content-Type: application/json
```

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

## P4：知识库

创建知识库：

```http
POST /ai/knowledge/bases
```

```json
{
  "name": "项目文档",
  "description": "NaviStar 本地研发资料"
}
```

文档入库：

```http
POST /ai/knowledge/documents
```

```json
{
  "base_id": "kb_uuid",
  "file_ids": ["file_uuid"],
  "chunk_size": 800,
  "chunk_overlap": 120
}
```

检索：

```http
POST /ai/knowledge/search
```

```json
{
  "base_id": "kb_uuid",
  "query": "后端启动契约",
  "top_k": 5
}
```
