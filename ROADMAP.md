# NaviStar（小星）开发路线图

> 最后更新：2026.5.24 · 林一整理

---

## 当前架构状态

```
NaviStar-Agent
│
├── 前端：React 19 + Electron + Tailwind CSS ✅
├── 后端：FastAPI + Uvicorn ✅
├── AI 核心：LangChain create_agent()（单 Agent） ✅
├── 模型：DeepSeek v4 (Pro / Flash) ✅
├── 数据库：SQLite (SQLAlchemy + aiosqlite) ✅
├── 打包：PyInstaller + electron-builder ✅
│
├── 中间件（2/6）：
│   ├── ✅ 对话摘要 (SummarizationMiddleware)
│   ├── ✅ 对话持久化 (save_conversation_middleware)
│   ├── ❌ 工具审计
│   ├── ❌ 速率限制
│   ├── ❌ 错误恢复
│   └── ❌ 上下文压缩
│
├── 工具：
│   ├── ✅ 天气查询 (get_weather)
│   ├── ✅ 地理编码 (get_geocode)
│   ├── ✅ IP 定位 (get_location_by_ip)
│   ├── ✅ 联网搜索 (Tavily)
│   ├── ✅ 抖音评论抓取
│   ├── ✅ 抖音视频搜索
│   ├── ✅ MCP 工具集成
│   ├── ❌ RAG 文档检索
│   ├── ❌ OSS 文件服务
│   ├── ❌ 办公文档生成 (Word/Excel/PPT)
│   └── ❌ 终端命令执行
│
├── 多 Agent：
│   ├── ⚠️ sub_agents.py 已写（researcher/writer/reviewer）
│   └── ❌ 未接入 agent_service.py（仍用 create_agent()）
│
└── 存储：
    ├── ✅ SQLite 对话持久化
    ├── ✅ LangGraph Checkpoint (memory.py)
    └── ❌ 向量数据库（RAG 基础）
```

---

## 开发路线（按优先级排序）

### 第一阶段：RAG 能力（1-2 周）

**目标：** 让 NaviStar 能检索本地文档，基于文档内容回答问题。

| 任务 | 说明 | 状态 |
|------|------|:---:|
| 安装 Chroma | `pip install chromadb` | 🔲 |
| 选中文 Embedding 模型 | text2vec-base-chinese 或 bge-large-zh | 🔲 |
| 文档加载器 | 支持 .txt / .md / .pdf | 🔲 |
| 文本切片 | RecursiveCharacterTextSplitter (chunk_size=500) | 🔲 |
| 向量化 + 存储 | Chroma.from_documents() → persist | 🔲 |
| 检索工具 | `search_knowledge_base` 工具挂到 Agent | 🔲 |
| RAG Prompt 模板 | 基于检索结果 + 引用溯源 | 🔲 |
| 前端 UI | 文档上传入口 + 检索来源展示 | 🔲 |

**用户可感知变化：** 上传一篇 PDF，NaviStar 能回答"这篇文章讲了什么？"

---

### 第二阶段：多 Agent 架构升级（2-3 周）

**目标：** 从单 Agent (`create_agent()`) 升级到 LangGraph StateGraph 多 Agent 编排。

| 任务 | 说明 | 状态 |
|------|------|:---:|
| 设计 StateGraph | 定义 MultiAgentState + 节点 + 条件路由 | 🔲 |
| Researcher 节点 | 搜索 + 信息收集子 Agent | ⚠️ 已有草案 |
| Writer 节点 | 整理信息 + 生成回答子 Agent | ⚠️ 已有草案 |
| Reviewer 节点 | 质量审查 + 打回重写机制 | ⚠️ 已有草案 |
| 路由逻辑 | 审核通过 → 输出；不通过 → Writer | ⚠️ 已有草案 |
| 接入 agent_service.py | 替换 create_agent() 为 StateGraph | 🔲 |
| Checkpoint 迁移 | 确保新架构兼容现有对话历史 | 🔲 |
| 流式输出适配 | StateGraph 的 SSE 流式响应 | 🔲 |
| RAG 工具集成 | 所有 Agent 节点共用 Chroma 向量库 | 🔲 |

**用户可感知变化：** 回答质量更高（经过了研究→撰写→审核），但界面不变。

---

### 第三阶段：中间件补全（1-2 周）

**目标：** 补齐简历中描述的 6 层中间件链，提升生产级稳定性。

| 中间件 | 说明 | 状态 |
|--------|------|:---:|
| ✅ 对话摘要 | 超 3000 token 自动摘要，保留最近 20 条 | ✅ |
| ✅ 对话持久化 | 每次对话自动存入 SQLite | ✅ |
| 🔲 **工具审计** | 记录每次工具调用：名称、参数、结果、耗时 | ❌ |
| 🔲 **速率限制** | 限制单用户每分钟请求数，防滥用 | ❌ |
| 🔲 **错误恢复** | 工具调用失败自动重试 + 降级策略 | ❌ |
| 🔲 **上下文压缩** | Token 预算管理 + 智能裁剪无关对话 | ❌ |
| ✅ 日志持久化 | loguru → 文件（已实现） | ✅ |

**工具审计中间件设计：**

```python
# 伪代码
@before_tool
def audit_tool(state, runtime):
    tool_name = runtime.tool_name
    tool_args = runtime.tool_args
    start_time = time.time()
    # 存入 state，在 after_tool 里计算耗时并记录

@after_tool  
def log_tool_result(state, runtime):
    elapsed = time.time() - state["tool_start_time"]
    logger.info(f"[审计] {tool_name} 耗时 {elapsed:.2f}s")
    # 可选：写入 audit_log 表
```

---

### 第四阶段：终端命令执行（1 周）

**目标：** Agent 能通过 cmd/powershell/bash 执行系统命令。

| 任务 | 说明 | 状态 |
|------|------|:---:|
| `run_terminal` 工具 | subprocess 封装，支持 Windows + WSL | 🔲 |
| 安全白名单 | 允许的命令列表 + 禁止的危险模式 | 🔲 |
| 路径白名单 | 文件读写仅限 NaviStar 项目目录 | 🔲 |
| 超时保护 | 默认 30 秒超时，可配置 | 🔲 |
| 输出截断 | 结果截断到 4000 字符，防炸上下文 | 🔲 |
| 前端展示 | 终端输出用代码块渲染 | 🔲 |

**实现方案：**

```python
# captured_tools.py 中新增
import subprocess
import os

ALLOWED_COMMANDS = ["dir", "ls", "cat", "type", "echo", "python", "node", "npm", "pip", "git"]
DANGEROUS = ["rm -rf", "format", "del /f", "shutdown", "> /dev/"]

@tool
def run_terminal(command: str) -> str:
    """执行终端命令（仅限白名单命令）"""
    cmd_base = command.strip().split()[0].lower()
    if cmd_base not in ALLOWED_COMMANDS:
        return f"❌ '{cmd_base}' 不在允许的命令列表中"
    if any(d in command.lower() for d in DANGEROUS):
        return "❌ 拒绝执行危险命令"
    try:
        result = subprocess.run(
            command, shell=True,
            capture_output=True, text=True, timeout=30,
            cwd="D:/work/PythonProjects/NaviStar-Agent"
        )
        return (result.stdout or result.stderr)[:4000]
    except Exception as e:
        return f"命令执行失败: {e}"
```

---

### 第五阶段：OSS 文件服务 + 办公文档生成（2 周）

**目标：** Agent 生成的文件自动上传 OSS，支持 Word/Excel/PPT 自然语言生成。

| 任务 | 说明 | 状态 |
|------|------|:---:|
| OSS SDK 集成 | 阿里云 OSS Python SDK | 🔲 |
| 文件上传工具 | `upload_to_oss` → 返回分享链接 | 🔲 |
| Word 生成 | python-docx 工具链 | 🔲 |
| Excel 生成 | openpyxl 工具链 | 🔲 |
| PPT 生成 | python-pptx 工具链 | 🔲 |
| "生成→存储→分发"闭环 | Agent 生成文件 → OSS 上传 → 返回链接 | 🔲 |

---

## 技术债务 & 优化（穿插进行）

| 项目 | 说明 | 优先级 |
|------|------|:---:|
| 单元测试 | 为核心模块加 pytest 测试 | 中 |
| 配置文件重构 | 统一 .env / mcp_tools.json / settings | 中 |
| 错误处理增强 | 当前 try/except 较粗粒度 | 低 |
| Docker 化 | 方便部署和沙箱隔离 | 低 |
| API 文档 | FastAPI 自动生成 Swagger，完善描述 | 低 |

---

## 学习资料对应

桌面 `学习/` 目录已准备就绪：

| 资料 | 对应阶段 |
|------|---------|
| [Chroma向量数据库入门指南](学习/Chroma向量数据库入门指南.md) | 第一阶段：RAG |
| [RAG深度指南](学习/RAG深度指南.md) | 第一阶段：RAG |
| [MCP协议入门与深度指南](学习/MCP协议入门与深度指南.md) | 参考：MCP 工具扩展 |

---

> 林一 · 2026.5.24 · NaviStar 路线图
