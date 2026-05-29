# NaviStar（小星）

> LangGraph + FastAPI + React/Electron 桌面 AI 助手。当前主链路支持流式对话、思考内容展示、SQLite 对话持久化、模型参数配置；工具与文件能力已有部分代码，但主对话链路尚未全部接入。

最后更新：2026-05-29

## 当前状态

| 模块 | 状态 | 说明 |
|------|------|------|
| 后端服务 | 可用 | FastAPI 应用定义在 `src/main.py`，路由分为 `/ai/*` 与 `/settings/*` |
| 流式对话 | 可用 | `POST /ai/chat/send/stream` 返回 SSE 数据 |
| 对话持久化 | 可用 | LangGraph checkpoint 与业务会话表共用 SQLite |
| 设置管理 | 可用 | 模型供应商、模型名、温度、reasoning_effort 写入 `src/resources/supplier.yaml` |
| 模型供应商 | 部分可用 | DeepSeek、OpenAI、小米 Mimo 代码路径存在 |
| 内置工具 | 已实现，未接入主链路 | 天气、地理编码、IP 定位、DDGS 搜索、抖音搜索/评论已定义，但 `chat_stream()` 当前传入 `tools=[]` |
| MCP 工具 | 占位 | 配置文件存在，加载逻辑当前注释 |
| Excel 工具 | 占位 | `office_tools.py` 中实现代码当前整体注释 |
| 文件上传/下载 | 待接入 | 新桌面端仅保留入口与接口文档，需要重新接通 `/ai/files/*` |
| 前端设置接口 | 已对齐基础配置 | 前端使用 `/settings/get_settings`、`/settings/update_settings`；API Key 保存仍需后端补新接口 |

## 项目结构

```text
NaviStar-Agent/
├── src/
│   ├── main.py                         # FastAPI 应用入口，注册 CORS 与路由
│   ├── agent/
│   │   ├── runner.py                   # Agent 工厂封装
│   │   ├── memory/memory.py            # LangGraph AsyncSqliteSaver checkpoint
│   │   ├── middlewares/middleware.py   # SummarizationMiddleware
│   │   ├── prompys/system_prompt.py    # 系统提示词
│   │   └── tools/tools.py              # 天气/搜索/IP/抖音工具注册函数
│   ├── app/
│   │   ├── api/v1/agent.py             # /ai/chat/* 路由
│   │   ├── api/v1/settings.py          # /settings/* 路由
│   │   ├── service/agent_service.py    # 流式对话、历史查询、删除、模型列表
│   │   ├── service/settings_service.py # supplier.yaml 与 .env 写入
│   │   ├── middlewares/middleware.py   # after_agent 会话持久化
│   │   ├── database/conversatuon_db.py # 会话 CRUD
│   │   ├── models/                     # 请求、响应、ORM、消息模型
│   │   └── tools/                      # MCP/Excel/抖音等工具代码
│   ├── common/
│   │   ├── config/                     # 路径、日志、数据库、环境配置
│   │   ├── models/                     # 通用模型
│   │   └── utils/                      # 文件、模型、天气、地理编码工具函数
│   └── resources/
│       ├── supplier.yaml               # 当前模型设置
│       ├── mcp_tools.json              # MCP 配置
│       ├── .env                        # API Key，本地敏感文件
│       ├── db/navistar.db              # SQLite 数据库
│       └── log/                        # 日志目录
├── desktop/
│   ├── electron/                       # Electron 主进程、preload
│   ├── src/                            # React 前端
│   ├── package.json                    # 前端与桌面脚本
│   └── vite.config.js
├── DESKTOP_BACKEND_API_CONTRACT.md     # 新桌面端待补后端接口契约
├── pyproject.toml                      # Python 依赖
├── ARCHITECTURE.md                     # 架构细节
└── ROADMAP.md                          # 后续路线
```

## 技术栈

| 层级 | 技术 |
|------|------|
| Agent | LangChain 1.x + LangGraph |
| LLM | DeepSeek、OpenAI、小米 Mimo 兼容路径 |
| 后端 | FastAPI + SQLAlchemy async + aiosqlite |
| 存储 | SQLite |
| 配置 | pydantic-settings + python-dotenv + YAML |
| 前端 | React 19 + Vite + Tailwind CSS |
| 桌面 | Electron 39 |
| 打包 | 后续补齐 PyInstaller + Electron 打包链路 |
| 包管理 | uv + npm |

## 环境要求

- Python 版本按 `pyproject.toml`：`>=3.14`
- Node.js：建议 `>=18`
- uv
- npm

## 本地运行

安装后端依赖：

```bash
uv sync
```

安装前端依赖：

```bash
cd desktop
npm install
```

启动后端：

```bash
uv run uvicorn main:app --app-dir src --host 127.0.0.1 --port 8000
```

启动前端 Web 调试：

```bash
cd desktop
npm run dev
```

启动 Electron 调试：

```bash
cd desktop
npm run desktop
```

生产目录构建：

```bash
cd desktop
npm run build
```

## 配置文件

`src/resources/.env` 保存 API Key：

```env
DEEPSEEK_API_KEY=your_deepseek_api_key
OPENAI_API_KEY=your_openai_api_key
MIMO_API_KEY=your_mimo_api_key
ONE_API_KEY=your_one_api_key
```

`src/resources/supplier.yaml` 保存当前模型运行参数：

```yaml
model:
  temperature: 1.0
  reasoning_effort: medium
  supplier: deepseek
  model_name: deepseek_v4_pro
```

## API

### 对话

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/ai/chat/send/stream` | 发送消息，返回 SSE 流 |
| `POST` | `/ai/chat/query` | 按 `thread_id` 查询历史消息 |
| `POST` | `/ai/chat/del` | 删除对话与 checkpoint |
| `GET` | `/ai/chat/query_list` | 查询会话列表 |
| `POST` | `/ai/chat/model_list` | 获取模型列表；当前实现未把列表放入 `data` |

### 设置

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/settings/get_settings` | 读取 `supplier.yaml` |
| `POST` | `/settings/update_settings` | 更新模型参数 |
| `GET` | `/settings/get_model_key` | 当前实现会写入 `.env`，函数名与行为需重命名 |

## 数据库

业务表：

- `conversation`：会话标题与时间
- `messages_group`：一次用户输入与回复的分组
- `message_content`：消息明细，按 `group_id` 与 `msg_order` 排序

LangGraph checkpoint 也写入同一个 `src/resources/db/navistar.db`。

## 近期注意点

- `src/main.py` 当前只定义 FastAPI `app`，直接执行 `python src/main.py` 不会启动服务。
- Electron 生产模式后端启动链路待补齐；后端当前未读取 `NAVISTAR_BACKEND_PORT`。
- 前端设置基础配置已对齐当前后端；技能、文件上传接口仍需后端补齐。
- 工具注册函数存在，但主对话 Agent 当前没有加载工具。

## License

MIT
