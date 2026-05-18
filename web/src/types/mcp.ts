export interface McpServer {
  name: string;
  transport: "stdio" | "sse";
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
}

export interface McpServerRequest {
  name: string;
  transport: "stdio" | "sse";
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
}
