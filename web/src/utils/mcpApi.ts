import type { ApiResponse } from "@/types";
import type { McpServer, McpServerRequest } from "@/types/mcp";

const MCP_BASE = import.meta.env.VITE_MCP_BASE || "/mcp";

export async function fetchMcpServers(): Promise<McpServer[]> {
  const response = await fetch(`${MCP_BASE}/list`);
  const result: ApiResponse<McpServer[]> = await response.json();
  if (result.code === 200 && result.data) {
    return result.data;
  }
  return [];
}

export async function addMcpServer(req: McpServerRequest): Promise<boolean> {
  const response = await fetch(`${MCP_BASE}/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  const result: ApiResponse = await response.json();
  return result.code === 200;
}

export async function updateMcpServer(req: McpServerRequest): Promise<boolean> {
  const response = await fetch(`${MCP_BASE}/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  const result: ApiResponse = await response.json();
  return result.code === 200;
}

export async function deleteMcpServer(name: string): Promise<boolean> {
  const response = await fetch(
    `${MCP_BASE}/delete?name=${encodeURIComponent(name)}`,
    { method: "GET" }
  );
  const result: ApiResponse = await response.json();
  return result.code === 200;
}
