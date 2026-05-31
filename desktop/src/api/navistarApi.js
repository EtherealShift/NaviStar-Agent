const FALLBACK_API_BASE_URL = "http://127.0.0.1:8000";

let apiBaseUrlPromise;

export function getApiBaseUrl() {
  if (!apiBaseUrlPromise) {
    apiBaseUrlPromise = Promise.resolve(
      window.navistar?.getApiBaseUrl?.() || import.meta.env.VITE_NAVISTAR_API_BASE_URL || FALLBACK_API_BASE_URL,
    );
  }
  return apiBaseUrlPromise;
}

async function request(path, options = {}) {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  if (result.code && result.code !== 200) {
    throw new Error(result.msg || "请求失败");
  }
  return result;
}

export async function fetchConversations() {
  const result = await request("/ai/chat/query_list", { method: "GET" });
  return result.data || [];
}

export async function fetchMessages(threadId) {
  const result = await request("/ai/chat/query", {
    method: "POST",
    body: JSON.stringify({ thread_id: threadId }),
  });
  return result.data || [];
}

export async function deleteConversation(threadId) {
  return request("/ai/chat/del", {
    method: "POST",
    body: JSON.stringify({ thread_id: threadId }),
  });
}

export async function fetchSettings() {
  const result = await request("/settings/get_settings", { method: "GET" });
  return result.data?.model || {};
}

export async function saveSettings(settings) {
  return request("/settings/update_settings", {
    method: "POST",
    body: JSON.stringify(settings),
  });
}

export async function saveModelKey(supplier, apiKey) {
  return request("/settings/update_model_key", {
    method: "POST",
    body: JSON.stringify({ supplier, api_key: apiKey }),
  });
}

export async function fetchModelList() {
  const result = await request("/ai/chat/model_list", { method: "POST" });
  return result.data;
}

export async function fetchMcpServers() {
  const result = await request("/mcp/servers", { method: "GET" });
  return result.data || [];
}

export async function createMcpServer(server) {
  return request("/mcp/servers", {
    method: "POST",
    body: JSON.stringify(server),
  });
}

export async function updateMcpServer(serverId, server) {
  return request(`/mcp/servers/${encodeURIComponent(serverId)}`, {
    method: "PUT",
    body: JSON.stringify(server),
  });
}

export async function deleteMcpServer(serverId) {
  return request(`/mcp/servers/${encodeURIComponent(serverId)}`, { method: "DELETE" });
}

export async function toggleMcpServer(serverId, enabled) {
  return request(`/mcp/servers/${encodeURIComponent(serverId)}/toggle`, {
    method: "POST",
    body: JSON.stringify({ enabled }),
  });
}

export async function testMcpServer(server) {
  return request("/mcp/servers/test", {
    method: "POST",
    body: JSON.stringify(server),
  });
}

export async function streamChatMessage(payload, handlers = {}) {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/ai/chat/send/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split(/\n\n/);
    buffer = frames.pop() || "";

    for (const frame of frames) {
      const lines = frame.split(/\r?\n/).filter((line) => line.startsWith("data:"));
      for (const line of lines) {
        const raw = line.replace(/^data:\s*/, "");
        if (!raw) continue;
        if (raw === "[DONE]") {
          handlers.onDone?.();
          return;
        }
        try {
          const event = JSON.parse(raw);
          if (event.error) handlers.onError?.(event.error);
          if (event.type === "AI" || event.type === "text") handlers.onText?.(event.content || "");
          if (event.type === "AI_Thinking" || event.type === "thinking") handlers.onThinking?.(event.content || "");
          if (event.type?.startsWith("tool_")) handlers.onTool?.(event);
        } catch {
          handlers.onText?.(raw);
        }
      }
    }
  }

  handlers.onDone?.();
}
