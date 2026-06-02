# MCP Service Design

Date: 2026-06-02

## Goal

Build MCP server management for NaviStar so users can configure MCP services from the desktop settings page, persist normalized MCP configuration in `src/resources/config.yaml`, and dynamically load only usable enabled MCP tools into the chat agent.

This design covers configuration CRUD, frontend/backend API integration, mainstream MCP config import compatibility, ModelScope support, and runtime MCP tool loading. It does not include persistent status history, advanced status caching, or full Agent tool-call UX changes.

## Current Context

The desktop frontend already has an MCP settings page and API wrapper functions, but the backend currently exposes only a minimal MCP route. The agent service already has a tool-loading extension point:

```python
tools.extend(await get_mcp_client())
```

The new implementation should replace the incomplete MCP backend with a clear service structure instead of following the existing test file.

## Architecture

The MCP implementation is split into three responsibilities.

### MCP Configuration Service

The configuration service reads and writes `mcpServers` in `src/resources/config.yaml`.

It accepts mainstream MCP input formats, normalizes each server into the format expected by `langchain-mcp-adapters`, validates the result, and only then persists it. The saved configuration is runtime-ready. It is not a raw copy of user input.

Supported operations:

- List MCP server configuration.
- Create a server.
- Update a server.
- Delete a server.
- Enable or disable a server.
- Import and merge servers from an MCP JSON object.

The service must preserve unrelated YAML sections such as `model`.

### MCP Runtime Service

The runtime service reads normalized `mcpServers` from `config.yaml`, filters by `enabled: true`, and attempts to load tools with `langchain_mcp_adapters.client.MultiServerMCPClient`.

It provides:

- Runtime status for the configuration page.
- Tool loading for chat.

Runtime status is not written back to `config.yaml`.

### FastAPI Route Layer

FastAPI routes should be redesigned around the new requirements instead of preserving the old route names as the primary contract.

The frontend API wrapper and MCP settings page will be updated to call the new routes.

## Normalized Configuration

The normalized configuration stored in `config.yaml` must be directly consumable by `langchain-mcp-adapters`.

Remote streamable HTTP services are stored with `transport: http`, because `langchain-mcp-adapters` examples use `http` for streamable HTTP.

```yaml
mcpServers:
  bing-cn-mcp-server:
    enabled: true
    transport: http
    url: https://mcp.api-inference.modelscope.net/5f71b785bb1a47/mcp
    headers: {}
```

stdio services are stored as:

```yaml
mcpServers:
  local-fetch:
    enabled: true
    transport: stdio
    command: npx
    args:
      - -y
      - mcp-server-fetch
    env: {}
```

## Supported Input Formats

### Claude/Cursor stdio Style

```json
{
  "mcpServers": {
    "local-fetch": {
      "command": "npx",
      "args": ["-y", "mcp-server-fetch"],
      "env": {}
    }
  }
}
```

This is normalized to `transport: stdio`.

### Explicit Transport Style

```json
{
  "mcpServers": {
    "remote": {
      "transport": "http",
      "url": "https://example.com/mcp"
    }
  }
}
```

Supported normalized transports are `stdio`, `http`, and `sse`.

### ModelScope Style

```json
{
  "mcpServers": {
    "bing-cn-mcp-server": {
      "type": "streamable_http",
      "url": "https://mcp.api-inference.modelscope.net/5f71b785bb1a47/mcp"
    }
  }
}
```

`type: streamable_http`, `transport: streamable_http`, and `transport: http` are all saved as `transport: http`.

## Normalization Rules

- `enabled` defaults to `true`.
- `command` implies `transport: stdio` when no transport is provided.
- `url` implies `transport: http` when no transport is provided.
- `type` is accepted as an input alias for `transport`.
- `streamable_http` is accepted as an input value and saved as `http`.
- `sse` is preserved as `sse`.
- `args` defaults to an empty list and must be a list after normalization.
- `env` defaults to an empty object and must be an object.
- `headers` defaults to an empty object and must be an object.
- stdio servers must have `command`.
- http and sse servers must have `url`.
- Unknown transports or incomplete server configs are rejected before saving.

## API Contract

Routes are mounted under `/mcp`.

```text
GET    /mcp/servers
POST   /mcp/servers
PUT    /mcp/servers/{name}
DELETE /mcp/servers/{name}
PUT    /mcp/servers/{name}/enabled
POST   /mcp/servers/import
GET    /mcp/servers/status
```

### GET /mcp/servers

Returns normalized configuration plus runtime status for the configuration page.

Runtime status is computed on request and is not persisted.

### POST /mcp/servers

Creates one server. The request can use supported input aliases such as `type: streamable_http`. The backend normalizes and validates the config before writing it.

Duplicate names are rejected.

### PUT /mcp/servers/{name}

Updates one server. If the request body includes a different `name`, the server is renamed after successful validation.

### DELETE /mcp/servers/{name}

Deletes one server from `config.yaml`.

### PUT /mcp/servers/{name}/enabled

Updates only the enabled flag.

Expected body:

```json
{
  "enabled": true
}
```

### POST /mcp/servers/import

Imports an object containing `mcpServers`. Each server is normalized and validated before saving.

Name conflicts are overwritten by imported values. Existing servers not present in the import remain unchanged.

### GET /mcp/servers/status

Returns runtime connection status without full configuration.

## Runtime Loading

The runtime service exposes two main functions.

### get_mcp_status()

Reads normalized config and returns status per server:

- `disabled` for disabled services.
- `connected` for enabled services whose tools load successfully.
- `error` for enabled services that fail to connect or load tools.

Successful status should include tool count and tool names when available. Error status should include a short error message suitable for the MCP settings page.

### get_mcp_client()

Used by the chat agent. It loads tools from enabled MCP services only.

If a service fails, the failure is logged and that service is skipped. Its tools are not added to chat. Chat continues with built-in tools and any other MCP services that loaded successfully.

If all enabled MCP services fail, the function returns an empty list.

## Frontend Integration

`desktop/src/api/navistarApi.js` will be updated to call the new REST routes.

The MCP settings page will keep the existing user-facing workflows:

- Load server list.
- Create server.
- Edit server.
- Delete server.
- Enable or disable server.
- Import MCP JSON.
- Display runtime connection status.

Enabled services that fail to connect are shown as failed on the MCP configuration page. Failed services are not loaded into chat.

## Error Handling

Configuration errors are rejected during create, update, or import and are not saved.

Runtime connection errors are returned as status and logged. They do not disable the server, do not change `config.yaml`, and do not block normal chat.

`config.yaml` must not store runtime-only fields such as `status`, `error`, `tool_count`, or `tools`.

## Tests

New tests should be written for the new behavior instead of copying the current MCP test file.

Backend service tests should cover:

- Reading `mcpServers` from `config.yaml`.
- Preserving unrelated YAML sections such as `model`.
- Normalizing Claude/Cursor stdio input.
- Normalizing ModelScope `type: streamable_http` input to `transport: http`.
- Creating, updating, deleting, enabling, and disabling servers.
- Importing and merging `mcpServers`, with duplicate names overwritten and absent existing servers preserved.
- Rejecting invalid configs before saving.
- Returning runtime status without writing status fields to YAML.
- Loading only enabled and connected MCP services into the chat tool list.

Frontend/API verification should cover:

- MCP settings page loads from the new API.
- Create, edit, delete, enable/disable, and import calls reach the backend.
- Enabled but failed services display failure status.
- Failed services do not enter the chat tool list.

## Acceptance Criteria

- `config.yaml` contains normalized, adapter-ready `mcpServers`.
- `transport: http` is used for streamable HTTP services saved for `langchain-mcp-adapters`.
- `type: streamable_http` from ModelScope input is accepted.
- CRUD and import APIs work through FastAPI and the desktop frontend API wrapper.
- Disabled MCP servers are not loaded.
- Enabled but unreachable MCP servers show failure status on the configuration page and are skipped by chat.
- Runtime status is never persisted in `config.yaml`.
- Existing model configuration in `config.yaml` is preserved.
