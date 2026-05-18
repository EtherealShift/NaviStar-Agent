import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Server,
  Save,
  X,
  Terminal,
  Link,
  ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchMcpServers, addMcpServer, deleteMcpServer } from "@/utils/mcpApi";
import type { McpServer } from "@/types/mcp";

interface ServerForm {
  name: string;
  transport: "stdio" | "sse";
  command: string;
  args: string;
  url: string;
  env: string;
}

const emptyForm: ServerForm = {
  name: "",
  transport: "stdio",
  command: "",
  args: "",
  url: "",
  env: "",
};

export default function McpPage() {
  const navigate = useNavigate();
  const [servers, setServers] = useState<McpServer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ServerForm>(emptyForm);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadServers = useCallback(async () => {
    const list = await fetchMcpServers();
    setServers(list);
  }, []);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  const handleAdd = async () => {
    if (!form.name.trim()) return;

    const req = {
      name: form.name.trim(),
      transport: form.transport,
      ...(form.transport === "stdio"
        ? {
            command: form.command || undefined,
            args: form.args ? form.args.split(" ").filter(Boolean) : undefined,
          }
        : {
            url: form.url || undefined,
          }),
      env: form.env
        ? Object.fromEntries(
            form.env.split(",").map((s) => {
              const [k, ...v] = s.split("=");
              return [k.trim(), v.join("=").trim()];
            })
          )
        : undefined,
    };

    const ok = await addMcpServer(req);
    if (ok) {
      setShowForm(false);
      setForm(emptyForm);
      loadServers();
    }
  };

  const handleDelete = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await deleteMcpServer(name);
    if (ok) {
      loadServers();
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <header
        className="flex items-center gap-4 px-6 py-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <motion.button
          onClick={() => navigate("/")}
          className="p-2 rounded-xl transition-all duration-200"
          style={{
            color: "var(--text-secondary)",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
        >
          <ArrowLeft size={18} />
        </motion.button>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            MCP 服务管理
          </h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            管理外部工具服务连接
          </p>
        </div>
      </header>

      <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            已配置 {servers.length} 个服务
          </span>
          <motion.button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, var(--accent) 0%, #3a7bd5 100%)",
              color: "#fff",
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus size={14} />
            添加服务
          </motion.button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="overflow-hidden mb-6"
            >
              <div
                className="rounded-2xl border p-5"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    新增 MCP 服务
                  </h3>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-1.5 rounded-lg hover:bg-[var(--bg-card-hover)]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                      服务名称
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="例如: filesystem"
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none border transition-all duration-200 focus:border-[var(--accent)]"
                      style={{
                        backgroundColor: "var(--bg-input)",
                        borderColor: "var(--border)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                      传输方式
                    </label>
                    <div
                      className="inline-flex items-center rounded-lg overflow-hidden"
                      style={{ border: "1px solid var(--border)" }}
                    >
                      <button
                        onClick={() => setForm({ ...form, transport: "stdio" })}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all duration-200"
                        style={{
                          backgroundColor: form.transport === "stdio" ? "var(--accent-dim)" : "transparent",
                          color: form.transport === "stdio" ? "var(--accent)" : "var(--text-muted)",
                        }}
                      >
                        <Terminal size={12} />
                        Stdio
                      </button>
                      <button
                        onClick={() => setForm({ ...form, transport: "sse" })}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all duration-200"
                        style={{
                          backgroundColor: form.transport === "sse" ? "var(--accent-dim)" : "transparent",
                          color: form.transport === "sse" ? "var(--accent)" : "var(--text-muted)",
                        }}
                      >
                        <Link size={12} />
                        SSE
                      </button>
                    </div>
                  </div>

                  {form.transport === "stdio" ? (
                    <>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                          命令
                        </label>
                        <input
                          type="text"
                          value={form.command}
                          onChange={(e) => setForm({ ...form, command: e.target.value })}
                          placeholder="例如: npx"
                          className="w-full px-3 py-2 rounded-lg text-sm outline-none border transition-all duration-200 focus:border-[var(--accent)]"
                          style={{
                            backgroundColor: "var(--bg-input)",
                            borderColor: "var(--border)",
                            color: "var(--text-primary)",
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                          参数（空格分隔）
                        </label>
                        <input
                          type="text"
                          value={form.args}
                          onChange={(e) => setForm({ ...form, args: e.target.value })}
                          placeholder="例如: -y @modelcontextprotocol/server-filesystem /path"
                          className="w-full px-3 py-2 rounded-lg text-sm outline-none border transition-all duration-200 focus:border-[var(--accent)]"
                          style={{
                            backgroundColor: "var(--bg-input)",
                            borderColor: "var(--border)",
                            color: "var(--text-primary)",
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                        服务地址
                      </label>
                      <input
                        type="text"
                        value={form.url}
                        onChange={(e) => setForm({ ...form, url: e.target.value })}
                        placeholder="例如: http://localhost:3001/sse"
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none border transition-all duration-200 focus:border-[var(--accent)]"
                        style={{
                          backgroundColor: "var(--bg-input)",
                          borderColor: "var(--border)",
                          color: "var(--text-primary)",
                        }}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                      环境变量（逗号分隔，KEY=VALUE 格式）
                    </label>
                    <input
                      type="text"
                      value={form.env}
                      onChange={(e) => setForm({ ...form, env: e.target.value })}
                      placeholder="例如: API_KEY=xxx, DEBUG=true"
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none border transition-all duration-200 focus:border-[var(--accent)]"
                      style={{
                        backgroundColor: "var(--bg-input)",
                        borderColor: "var(--border)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>

                  <motion.button
                    onClick={handleAdd}
                    disabled={!form.name.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-40"
                    style={{
                      background: "linear-gradient(135deg, var(--accent) 0%, #3a7bd5 100%)",
                      color: "#fff",
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Save size={14} />
                    保存
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {servers.length === 0 && !showForm && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-3"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: "var(--bg-card)" }}
            >
              <Server size={28} style={{ color: "var(--text-muted)" }} />
            </div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              暂无 MCP 服务配置
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              点击上方"添加服务"开始配置
            </p>
          </motion.div>
        )}

        <div className="space-y-2">
          {servers.map((server, i) => (
            <motion.div
              key={server.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="rounded-xl border overflow-hidden"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border)",
              }}
            >
              <button
                onClick={() => setExpanded(expanded === server.name ? null : server.name)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-[var(--bg-card-hover)]"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: server.transport === "stdio" ? "var(--accent-dim)" : "rgba(168, 85, 247, 0.1)",
                  }}
                >
                  {server.transport === "stdio" ? (
                    <Terminal size={14} style={{ color: "var(--accent)" }} />
                  ) : (
                    <Link size={14} style={{ color: "#a855f7" }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {server.name}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {server.transport === "stdio"
                      ? `${server.command || ""} ${(server.args || []).join(" ")}`
                      : server.url || ""}
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: expanded === server.name ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
                </motion.div>
                <button
                  onClick={(e) => handleDelete(server.name, e)}
                  className="p-1.5 rounded-lg transition-colors duration-150 hover:bg-[var(--bg-card-hover)]"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Trash2 size={13} />
                </button>
              </button>

              <AnimatePresence>
                {expanded === server.name && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                    className="overflow-hidden"
                  >
                    <div
                      className="px-4 pb-4 pt-1 text-xs space-y-2 border-t"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div className="flex gap-2">
                        <span style={{ color: "var(--text-muted)" }}>传输:</span>
                        <span style={{ color: "var(--text-secondary)" }}>{server.transport}</span>
                      </div>
                      {server.command && (
                        <div className="flex gap-2">
                          <span style={{ color: "var(--text-muted)" }}>命令:</span>
                          <code
                            className="px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: "var(--bg-input)", color: "var(--accent)" }}
                          >
                            {server.command}
                          </code>
                        </div>
                      )}
                      {server.args && server.args.length > 0 && (
                        <div className="flex gap-2">
                          <span style={{ color: "var(--text-muted)" }}>参数:</span>
                          <code
                            className="px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: "var(--bg-input)", color: "var(--text-secondary)" }}
                          >
                            {server.args.join(" ")}
                          </code>
                        </div>
                      )}
                      {server.url && (
                        <div className="flex gap-2">
                          <span style={{ color: "var(--text-muted)" }}>地址:</span>
                          <code
                            className="px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: "var(--bg-input)", color: "var(--accent)" }}
                          >
                            {server.url}
                          </code>
                        </div>
                      )}
                      {server.env && Object.keys(server.env).length > 0 && (
                        <div className="flex gap-2">
                          <span style={{ color: "var(--text-muted)" }}>环境变量:</span>
                          <span style={{ color: "var(--text-secondary)" }}>
                            {Object.keys(server.env).join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
