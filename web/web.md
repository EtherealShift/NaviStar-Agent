
## 开发服务器：http://localhost:5173/

### 项目结构

Plain Text

    web/
    ├── src/
    │   ├── components/
    │   │   ├── Sidebar.tsx        ← 会话管理侧栏（新建/切换/删除对话）
    │   │   ├── ChatArea.tsx       ← 聊天区域（消息列表 + 输入框）
    │   │   ├── MessageBubble.tsx  ← 消息气泡（用户/AI，Markdown 渲染）
    │   │   ├── InputArea.tsx      ← 输入区域（Enter 发送，Shift+Enter 换行）
    │   │   └── WelcomeScreen.tsx  ← 欢迎界面（快捷提问卡片）
    │   ├── pages/
    │   │   └── Home.tsx           ← 主页面（组合所有组件 + SSE 流式逻辑）
    │   ├── store/
    │   │   └── chatStore.ts       ← Zustand 状态管理（对话/消息/流式状态）
    │   ├── types/
    │   │   └── index.ts           ← TypeScript 类型定义
    │   ├── utils/
    │   │   └── api.ts             ← API 调用（SSE 流式 + 历史查询 + 删除）
    │   ├── index.css              ← 全局样式（深色主题 + Markdown 样式）
    │   ├── App.tsx                ← 路由入口
    │   └── main.tsx               ← 应用入口
    └── vite.config.ts             ← Vite 配置（含 /AI 代理到后端 8000 端口）
### 核心功能
### 功能	说明
#### 🎨 GPT 风格深色主题	#212121 背景 + #10a37f 翡翠绿强调色
#### 💬 SSE 流式对话	逐字显示 AI 回复，带闪烁光标
#### 📝 Markdown 渲染	支持代码块、表格、引用、列表等
#### 📂 多会话管理	侧栏新建/切换/删除对话，localStorage 持久化
#### 🔄 Vite 代理	/AI 请求自动转发到后端 localhost:8000
#### ⌨️ 键盘快捷键	Enter 发送，Shift+Enter 换行


### 启动
#### 进入web目录
`npm run dev `
### 访问： **http://localhost:5173/** 
