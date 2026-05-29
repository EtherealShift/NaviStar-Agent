# NaviStar（小星）开发路线图

最后更新：2026-05-29

## 当前基线

| 方向 | 状态 | 备注 |
|------|------|------|
| FastAPI 后端 | ✅ | `src/main.py` 定义 app、路由、lifespan |
| React/Electron 前端 | ✅ | `desktop/` 新版聊天 UI、会话列表、流式渲染已存在 |
| SSE 流式对话 | ✅ | `/ai/chat/send/stream` |
| SQLite 对话历史 | ✅ | conversation / messages_group / message_content |
| LangGraph checkpoint | ✅ | `AsyncSqliteSaver` |
| 自动摘要中间件 | ✅ | `SummarizationMiddleware` |
| 设置读写 | ✅ | 新桌面端已接入 `/settings/get_settings` 与 `/settings/update_settings` |
| 模型列表 | ⚠️ | 能拉取 DeepSeek 列表，但返回值未写入 `data` |
| 天气/搜索/IP/抖音工具 | ⚠️ | 工具已定义，主 Agent 未加载 |
| MCP | ⚠️ | 配置存在，加载代码注释 |
| Excel/Office | ⚠️ | 代码存在但注释，未接入 |
| 文件上传/下载 | ❌ | 新桌面端只保留入口与接口契约，后端路由仍需实现 |
| RAG | ❌ | 依赖有 Chroma，业务未实现 |
| 多 Agent | ❌ | `sub_agents.py` 草案存在，未接入主链路 |

## P0：先修主链路

| 任务 | 成功标准 |
|------|----------|
| 后端启动契约闭合 | `uv run python src/main.py` 或 PyInstaller exe 能真正启动 uvicorn |
| 读取 `NAVISTAR_BACKEND_PORT` | Electron 生产模式能启动非固定端口后端 |
| 补 API Key 设置接口 | 配置页能安全保存 DeepSeek/OpenAI/Mimo/One API Key |
| 修复模型列表返回 | `/ai/chat/model_list` 返回实际数组或分组对象 |
| 清理设置 key 接口命名 | 更新 API 名称或行为，避免 `get_model_key` 执行写入 |

## P1：恢复工具能力

| 任务 | 成功标准 |
|------|----------|
| 在 `chat_stream()` 加载 `install_tools()` | 普通对话可调用天气、IP、DDGS、抖音工具 |
| 按开关加载 Tavily | 联网搜索启用时加入 `TavilySearch` |
| 工具错误隔离 | 单个工具失败不终止整轮对话 |
| 工具调用审计 | 日志记录工具名、参数摘要、耗时、成功/失败 |

## P2：文件与 Office 能力

| 任务 | 成功标准 |
|------|----------|
| 恢复文件上传路由 | 前端 `uploadFiles()` 可用，返回标准文件元数据 |
| 恢复文件下载路由 | 生成文件可通过稳定 URL 下载 |
| 恢复 Excel 工具 | `excel_create_workbook` 等工具可被 Agent 调用 |
| 接入附件解析 | 图片与文本附件能进入模型上下文 |
| 文件 manifest | 上传文件与生成文件都有可追踪记录 |

## P3：MCP

| 任务 | 成功标准 |
|------|----------|
| 恢复 MCP client service | 支持 stdio / SSE / WebSocket / streamable HTTP 中至少 stdio 与 HTTP |
| 配置校验 | 错误配置可提示，不影响主对话 |
| 前端 MCP 设置对齐 | 右侧控制台展示状态与配置入口，后端能加载新配置 |
| MCP 状态接口 | 前端可展示服务数量、连接状态、工具数量 |

## P4：RAG

| 任务 | 成功标准 |
|------|----------|
| 文档上传入库 | `.txt` / `.md` / `.pdf` 至少支持两类 |
| 文本切片 | chunk_size / overlap 可配置 |
| Chroma 持久化 | 向量库保存到 `src/resources` |
| 检索工具 | Agent 可调用 `search_knowledge_base` |
| 来源展示 | 回复能带检索来源 |

## P5：多 Agent

| 任务 | 成功标准 |
|------|----------|
| 梳理 `sub_agents.py` | 明确 researcher / writer / reviewer 输入输出 |
| StateGraph 主流程 | 用 LangGraph 编排多节点 |
| SSE 兼容 | 多 Agent 输出仍能流式显示 |
| checkpoint 兼容 | 不破坏现有 `thread_id` 历史 |

## 技术债

| 项目 | 优先级 |
|------|--------|
| `conversatuon_db.py` 文件名拼写修正 | 中 |
| 供应商名称统一：`xiaomi` / `mimo` | 中 |
| `.env` key 命名统一：DeepSeek/OpenAI/Mimo/One API | 中 |
| 前端 API client 与后端路由生成统一类型 | 中 |
| 给 `agent_service.py` 增加单元测试 | 中 |
| 数据库迁移方案 | 低 |
| Docker 或沙箱运行 | 低 |

## 推荐近期顺序

1. 修后端启动与端口读取。
2. 补 API Key 保存接口。
3. 修模型列表返回。
4. 接入基础工具。
5. 恢复文件上传下载。
