# NaviStar (小星)

> 基于 DeepSeek 大语言模型的桌面 AI 智能助手，支持流式对话、联网搜索、天气查询、MCP 工具扩展。

## 特性

- **流式对话** — 基于 SSE 协议的实时流式响应，支持思考过程展示
- **联网搜索** — 集成 Tavily 搜索引擎，可随时获取最新信息
- **天气查询** — 支持国内城市天气预报
- **IP 定位** — 自动获取当前设备地理位置
- **MCP 扩展** — 支持通过 MCP 协议接入第三方工具
- **对话持久化** — SQLite 存储，支持历史会话搜索与管理
- **深色主题** — 基于 Tailwind CSS 的现代化深色 UI
- **跨平台桌面端** — Electron 封装，支持 Windows

## 项目结构

```
NaviStar-Agent/
├── src/                              # Python 后端
│   ├── main.py                       # FastAPI 应用入口（开发模式）
│   ├── backend_main.py               # 后端子进程入口（生产模式，带父进程监控）
│   │
│   ├── agent/                        # AI Agent 核心
│   │   ├── runner.py                 # Agent 创建与运行
│   │   ├── tools/tools.py            # 内置工具注册（搜索/天气/IP定位）
│   │   ├── prompys/system_prompt.py  # 系统提示词
│   │   └── middlewares/middleware.py # 对话摘要中间件
│   │
│   ├── app/                          # 应用层
│   │   ├── api/v1/agent.py           # FastAPI 路由（/ai/* 端点）
│   │   ├── service/
│   │   │   ├── agent_service.py      # Agent 业务逻辑
│   │   │   └── settings_service.py   # 设置管理
│   │   ├── tools/mcp_tools.py        # MCP 工具集成
│   │   ├── middlewares/middleware.py  # 对话持久化中间件
│   │   ├── database/                 # SQLite 数据库操作
│   │   └── models/                   # 数据模型（实体/请求/响应）
│   │
│   ├── common/                       # 公共基础设施
│       ├── config/                   # 配置管理（路径/设置/日志/数据库）
│       ├── memory/memory.py          # LangGraph 检查点持久化
│       ├── models/                   # 通用模型与统一响应格式
│       └── utils/                    # 外部 API 工具函数
│   └── resources/                    # 后端静态资源文件
│
├── web/                              # Electron + React 前端
│   ├── electron/
│   │   ├── main.cjs                  # Electron 主进程
│   │   ├── preload.cjs               # 预加载脚本（IPC 桥接）
│   │   └── startup.html              # 启动等待页
│   ├── src/
│   │   ├── main.jsx                  # React 入口
│   │   ├── App.jsx                   # 主应用组件
│   │   ├── api/chatApi.js            # SSE 流式 API 客户端
│   │   ├── hooks/                    # 自定义 Hooks
│   │   ├── components/               # UI 组件
│   │   │   ├── Sidebar.jsx           # 侧边栏（会话历史）
│   │   │   ├── ChatHeader.jsx        # 聊天头部
│   │   │   ├── ChatInput.jsx         # 输入栏（模式/模型/温度/联网）
│   │   │   ├── MessageList.jsx       # 消息列表
│   │   │   ├── MessageBubble.jsx     # 消息气泡（Markdown 渲染）
│   │   │   ├── SettingsPanel.jsx     # 设置面板（API Keys / MCP）
│   │   │   ├── ModelPicker.jsx       # 模型选择器
│   │   │   ├── EmptyState.jsx        # 空状态
│   │   │   └── LoadingDots.jsx       # 加载动画
│   │   └── styles/index.css          # 全局样式
│   ├── index.html                    # HTML 入口
│   ├── vite.config.js                # Vite 配置
│   └── tailwind.config.js            # Tailwind CSS 配置
│
├── backend.spec                      # PyInstaller 打包配置
├── pyproject.toml                    # Python 项目依赖与元数据
└── .env                              # 环境变量（API Keys）
```

## 技术栈

| 层级 | 技术 |
|------|------|
| AI 框架 | LangChain + LangGraph |
| 模型 | DeepSeek v4 (Pro / Flash) |
| 后端 | FastAPI + Uvicorn |
| 数据库 | SQLite (SQLAlchemy + aiosqlite) |
| 前端 | React 19 + Tailwind CSS 3 |
| 桌面 | Electron 39 |
| 构建 | Vite + PyInstaller + electron-builder |
| 包管理 | uv (Python) / npm (前端) |

## 快速开始

### 1. 环境要求

- Python >= 3.12
- Node.js >= 18
- [uv](https://docs.astral.sh/uv/) (Python 包管理)

### 2. 克隆项目

```bash
git clone <repo-url>
cd NaviStar-Agent
```

### 3. 配置环境变量

在项目根目录创建 `.env` 文件：

```env
NAVISTAR_ENV=development
DEEPSEEK_API_KEY=your_deepseek_api_key
TAVILY_API_KEY=your_tavily_api_key   # 可选，用于联网搜索
ONE_API_KEY=your_one_api_key         # 可选，用于抖音工具
```

### 4. 安装依赖

```bash
# Python 后端依赖
uv sync

# 前端依赖
cd web
npm install
```

### 5. 启动开发环境

**后端：**

```bash
uv run python src/main.py
```

后端默认运行在 `http://127.0.0.1:8000`。

**前端 (Web 开发模式)：**

```bash
cd web
npm run dev
```

**桌面应用 (Electron 开发模式)：**

```bash
cd web
npm run desktop
```

### 6. 生产构建

```bash
cd web
npm run build:desktop
```

该命令会依次执行：
1. PyInstaller 将 Python 后端打包为 `NaviStarBackend.exe`
2. Vite 构建 React 前端
3. electron-builder 打包为可分发的桌面应用

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/ai/chat/send/stream` | 发送消息，返回 SSE 流式响应 |
| `POST` | `/ai/chat/query` | 按 thread_id 查询对话历史 |
| `POST` | `/ai/chat/del` | 删除指定对话 |
| `GET` | `/ai/chat/query_list` | 获取全部对话列表 |
| `POST` | `/ai/chat/model_list` | 获取可用模型列表 |
| `GET` | `/ai/settings` | 获取应用设置 |
| `POST` | `/ai/settings` | 更新应用设置 |

## 项目配置

- **统一配置入口** — 后端通过 `pydantic-settings` 加载环境变量，入口为 `common.config.app_settings.get_app_settings()`
- **开发模式** — `NAVISTAR_ENV=development`，配置从项目根目录 `.env` 加载，数据写入项目根目录下的 `db/`、`logs/`
- **生产模式** — `NAVISTAR_ENV=production`、`NAVISTAR_PRODUCTION=1` 或 PyInstaller 打包后，配置从 `%APPDATA%/NaviStar/.env` 加载
- **运行时设置** — 前端设置面板保存 API Key 到当前环境的 `.env`，MCP 配置保存到当前环境的 `mcp_tools.json`
- **后端资源** — 包内 JSON 等静态资源统一放在 `src/resources/`，PyInstaller 会打包到后端 `resources/` 目录

## License

MIT
