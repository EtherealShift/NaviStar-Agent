# NaviStar Chat Web

Electron + React + Vite 桌面端聊天应用，默认通过 Vite 代理连接本地后端 `http://localhost:8000`。

## 功能

- Electron 桌面窗口，深色 ChatGPT / Claude 风格聊天布局
- 左侧会话列表、新建会话、搜索、收起展开、用户入口
- 历史会话自动加载，无历史时自动创建本地新会话
- 消息流式输出、loading 状态、失败提示
- 支持停止生成、删除会话
- Markdown 渲染、GFM 表格/列表、代码高亮、消息复制、代码块复制
- Enter 发送，Shift + Enter 换行，输入框自动增高
- 响应式布局，窄屏自动使用侧边栏抽屉

## 安装

```bash
cd web
npm install
```

## 开发运行

浏览器调试：

```bash
npm run dev
```

桌面端调试：

```bash
npm run desktop
```

浏览器调试地址通常是 `http://127.0.0.1:5173`。

后端本地启动后，前端会通过 Vite proxy 访问 `http://localhost:8000/ai/*`。

## 后端接口

默认请求路径：

- `GET /ai/chat/query_list`
- `POST /ai/chat/query`
- `POST /ai/chat/send/stream`

如果后端不在 `localhost:8000`，复制 `.env.example` 为 `.env` 并设置：

```bash
VITE_API_BASE_URL=http://你的后端地址
```

为空时会使用 Vite 代理，适合本地开发。

## 构建

```bash
npm run build
```

桌面端目录构建：

```bash
npm run build:desktop
```
