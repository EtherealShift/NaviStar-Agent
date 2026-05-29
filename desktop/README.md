# NaviStar Desktop

新桌面端。旧 `web/` 不再沿用。

## 栈

- Electron
- Vite
- React
- Tailwind CSS v4
- shadcn 风格本地组件

## 开发

```bash
npm install
npm run dev
```

另开终端：

```bash
$env:NAVISTAR_DESKTOP_DEV_URL="http://127.0.0.1:5173"
npm run dev:desktop
```

## 直接打开桌面端

```bash
npm run desktop
```

这个命令会先构建 `dist/`，再打开 Electron。

## 启动后端

```bash
npm run backend
```

后端默认地址：

```text
http://127.0.0.1:8000
```

可覆盖：

```bash
NAVISTAR_API_BASE_URL=http://127.0.0.1:8000 npm run desktop
```

Windows PowerShell：

```powershell
$env:NAVISTAR_API_BASE_URL="http://127.0.0.1:8000"
npm run desktop
```

## Electron 安装失败

如果看到 `Electron failed to install correctly`，通常是 Electron 二进制下载中断。PowerShell 里重试：

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
npm rebuild electron
```

## 当前已接入

- `GET /ai/chat/query_list`
- `POST /ai/chat/query`
- `POST /ai/chat/del`
- `POST /ai/chat/send/stream`
- `GET /settings/get_settings`
- `POST /settings/update_settings`
- `POST /ai/chat/model_list`，但后端当前返回空 `data`

## UI 边界

右侧控制台展示文件、工具、MCP、知识库等入口，但这些入口只做“待补接口”标注，不调用未实现后端。
