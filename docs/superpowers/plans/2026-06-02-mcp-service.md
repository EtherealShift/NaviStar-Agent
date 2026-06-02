# MCP Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build MCP CRUD, normalized config persistence, runtime status checks, and dynamic loading of connected enabled MCP tools into chat.

**Architecture:** Split MCP work into a configuration service and a runtime service. The configuration service normalizes user input into `langchain-mcp-adapters`-ready YAML under `src/resources/config.yaml`; the runtime service reads that normalized config, reports connection status, and returns tools only for enabled services that successfully load.

**Tech Stack:** FastAPI, Pydantic v2, PyYAML, `langchain-mcp-adapters==0.2.2`, React 19, Vite.

---

## File Structure

- Modify `src/app/mcp/service/mcp_service.py`: configuration CRUD, import merge, validation, and adapter-ready normalization.
- Create `src/app/mcp/service/mcp_runtime.py`: runtime MCP status checks and chat tool loading via `MultiServerMCPClient`.
- Modify `src/app/models/req/mcp_req.py`: Pydantic request models for server payloads and enabled toggles.
- Modify `src/app/api/v1/mcps.py`: REST-style MCP API routes under `/mcp/servers`.
- Modify `src/app/service/agent_service.py`: import `get_mcp_client()` from the runtime service.
- Modify `desktop/src/api/navistarApi.js`: point frontend API calls at the new REST routes.
- Modify `desktop/src/App.jsx`: normalize returned runtime status and display failed MCP services on the settings page.
- Create `src/test/test_mcp_service_config.py`: backend config service tests.
- Create `src/test/test_mcp_runtime.py`: runtime status and tool loading tests with mocked MCP client.
- Create `src/test/test_mcp_api.py`: route contract tests with FastAPI `TestClient`.

---

### Task 1: MCP Configuration Service

**Files:**
- Create: `src/test/test_mcp_service_config.py`
- Modify: `src/app/mcp/service/mcp_service.py`

- [ ] **Step 1: Write failing configuration service tests**

Create `src/test/test_mcp_service_config.py`:

```python
import tempfile
import unittest
from pathlib import Path

import yaml

from app.mcp.service import mcp_service


class MCPConfigServiceTest(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.TemporaryDirectory()
        self.config_path = Path(self.tmp_dir.name) / "config.yaml"
        self.original_path = mcp_service.CONFIG_YAML_PATH
        mcp_service.CONFIG_YAML_PATH = str(self.config_path)

    def tearDown(self):
        mcp_service.CONFIG_YAML_PATH = self.original_path
        self.tmp_dir.cleanup()

    def write_config(self, data):
        self.config_path.write_text(
            yaml.safe_dump(data, allow_unicode=True, sort_keys=False),
            encoding="utf-8",
        )

    def read_config(self):
        return yaml.safe_load(self.config_path.read_text(encoding="utf-8"))

    def test_modelscope_input_normalizes_to_http_and_preserves_model(self):
        self.write_config({"model": {"temperature": 0.7}, "mcpServers": {}})

        result = mcp_service.add_mcp_server(
            {
                "name": "bing-cn-mcp-server",
                "type": "streamable_http",
                "url": "https://mcp.api-inference.modelscope.net/5f71b785bb1a47/mcp",
            }
        )

        self.assertEqual(result.code, 200)
        config = self.read_config()
        self.assertEqual(config["model"], {"temperature": 0.7})
        server = config["mcpServers"]["bing-cn-mcp-server"]
        self.assertEqual(server["transport"], "http")
        self.assertEqual(server["headers"], {})
        self.assertTrue(server["enabled"])
        self.assertNotIn("type", server)

    def test_stdio_crud_and_enabled_updates_target_only(self):
        self.write_config({"model": {"supplier": "deepseek"}, "mcpServers": {}})

        add_result = mcp_service.add_mcp_server(
            {
                "name": "local-fetch",
                "command": "npx",
                "args": ["-y", "mcp-server-fetch"],
                "env": {"API_KEY": "secret"},
            }
        )
        self.assertEqual(add_result.code, 200)

        update_result = mcp_service.update_mcp_server(
            "local-fetch",
            {
                "name": "local-fetch",
                "transport": "stdio",
                "command": "uvx",
                "args": ["mcp-server-fetch"],
            },
        )
        self.assertEqual(update_result.code, 200)

        enabled_result = mcp_service.set_mcp_server_enabled("local-fetch", False)
        self.assertEqual(enabled_result.code, 200)

        config = self.read_config()
        server = config["mcpServers"]["local-fetch"]
        self.assertFalse(server["enabled"])
        self.assertEqual(server["transport"], "stdio")
        self.assertEqual(server["command"], "uvx")
        self.assertEqual(server["args"], ["mcp-server-fetch"])
        self.assertEqual(server["env"], {})
        self.assertEqual(config["model"], {"supplier": "deepseek"})

        delete_result = mcp_service.delete_mcp_server("local-fetch")
        self.assertEqual(delete_result.code, 200)
        self.assertEqual(self.read_config()["mcpServers"], {})

    def test_import_merges_and_overwrites_duplicate_names(self):
        self.write_config(
            {
                "model": {"model_name": "deepseek-v4-flash"},
                "mcpServers": {
                    "existing": {
                        "enabled": True,
                        "transport": "http",
                        "url": "https://example.com/existing",
                        "headers": {},
                    },
                    "remote": {
                        "enabled": True,
                        "transport": "http",
                        "url": "https://old.example.com/mcp",
                        "headers": {},
                    },
                },
            }
        )

        result = mcp_service.import_mcp_servers(
            {
                "mcpServers": {
                    "remote": {
                        "type": "streamable_http",
                        "url": "https://new.example.com/mcp",
                    },
                    "local-fetch": {
                        "command": "npx",
                        "args": ["-y", "mcp-server-fetch"],
                    },
                }
            }
        )

        self.assertEqual(result.code, 200)
        servers = self.read_config()["mcpServers"]
        self.assertIn("existing", servers)
        self.assertEqual(servers["remote"]["transport"], "http")
        self.assertEqual(servers["remote"]["url"], "https://new.example.com/mcp")
        self.assertEqual(servers["local-fetch"]["transport"], "stdio")
        self.assertEqual(servers["local-fetch"]["command"], "npx")

    def test_invalid_config_is_rejected_without_saving(self):
        self.write_config({"model": {"temperature": 1.0}, "mcpServers": {}})

        result = mcp_service.add_mcp_server(
            {
                "name": "broken",
                "transport": "http",
            }
        )

        self.assertEqual(result.code, 400)
        self.assertEqual(self.read_config()["mcpServers"], {})


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```powershell
$env:PYTHONPATH="src"; uv run python -m unittest src.test.test_mcp_service_config -v
```

Expected: FAIL because `CONFIG_YAML_PATH`, `add_mcp_server`, `update_mcp_server`, `delete_mcp_server`, `set_mcp_server_enabled`, and `import_mcp_servers` are incomplete or missing.

- [ ] **Step 3: Replace the configuration service implementation**

Replace `src/app/mcp/service/mcp_service.py` with:

```python
from pathlib import Path
from typing import Any

import yaml

from common.config.constants import CONFIG_YAML_PATH as DEFAULT_CONFIG_YAML_PATH
from common.models.result import Result

CONFIG_YAML_PATH = DEFAULT_CONFIG_YAML_PATH
MCP_SERVERS_KEY = "mcpServers"
VALID_TRANSPORTS = {"stdio", "http", "sse"}
REMOTE_TRANSPORTS = {"http", "sse"}


class MCPConfigError(ValueError):
    """Raised when an MCP server config cannot be normalized."""


def _read_config() -> dict[str, Any]:
    path = Path(CONFIG_YAML_PATH)
    if not path.exists():
        return {MCP_SERVERS_KEY: {}}

    with path.open("r", encoding="utf-8") as file:
        data = yaml.safe_load(file) or {}

    if not isinstance(data, dict):
        data = {}
    data.setdefault(MCP_SERVERS_KEY, {})
    if not isinstance(data[MCP_SERVERS_KEY], dict):
        data[MCP_SERVERS_KEY] = {}
    return data


def _write_config(config: dict[str, Any]) -> None:
    path = Path(CONFIG_YAML_PATH)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        yaml.safe_dump(config, file, allow_unicode=True, sort_keys=False)


def _as_mapping(value: Any, field_name: str) -> dict[str, Any]:
    if value in (None, ""):
        return {}
    if isinstance(value, dict):
        return dict(value)
    raise MCPConfigError(f"{field_name} must be an object")


def _as_args(value: Any) -> list[str]:
    if value in (None, ""):
        return []
    if isinstance(value, list):
        return [str(item) for item in value]
    raise MCPConfigError("args must be an array")


def _clean_name(value: Any) -> str:
    name = str(value or "").strip()
    if not name:
        raise MCPConfigError("MCP server name is required")
    return name


def _normalize_transport(server: dict[str, Any]) -> str:
    raw_transport = server.get("transport") or server.get("type")
    if not raw_transport:
        if server.get("command"):
            raw_transport = "stdio"
        elif server.get("url"):
            raw_transport = "http"

    transport = str(raw_transport or "").strip().lower().replace("-", "_")
    if transport == "streamable_http":
        transport = "http"
    if transport not in VALID_TRANSPORTS:
        raise MCPConfigError(f"unsupported MCP transport: {raw_transport}")
    return transport


def normalize_mcp_server(name: str, server: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(server, dict):
        raise MCPConfigError("MCP server config must be an object")

    transport = _normalize_transport(server)
    normalized: dict[str, Any] = {
        "enabled": bool(server.get("enabled", True)),
        "transport": transport,
    }

    description = str(server.get("description") or "").strip()
    if description:
        normalized["description"] = description

    if transport == "stdio":
        command = str(server.get("command") or "").strip()
        if not command:
            raise MCPConfigError(f"{name}: stdio transport requires command")
        normalized["command"] = command
        normalized["args"] = _as_args(server.get("args"))
        normalized["env"] = _as_mapping(server.get("env"), "env")
        return normalized

    url = str(server.get("url") or "").strip()
    if not url:
        raise MCPConfigError(f"{name}: {transport} transport requires url")
    normalized["url"] = url
    normalized["headers"] = _as_mapping(server.get("headers"), "headers")
    return normalized


def normalize_mcp_server_config(servers: dict[str, Any]) -> dict[str, dict[str, Any]]:
    if not isinstance(servers, dict):
        raise MCPConfigError("mcpServers must be an object")
    return {
        _clean_name(name): normalize_mcp_server(_clean_name(name), server)
        for name, server in servers.items()
    }


def _payload_name(payload: dict[str, Any], fallback: str | None = None) -> str:
    return _clean_name(payload.get("name") or payload.get("id") or payload.get("key") or fallback)


def _result_failure(exc: Exception) -> Result:
    return Result(msg=str(exc)).failure()


def get_normalized_mcp_servers() -> dict[str, dict[str, Any]]:
    config = _read_config()
    return dict(config.get(MCP_SERVERS_KEY, {}))


def get_mcp_servers() -> Result:
    return Result(data={MCP_SERVERS_KEY: get_normalized_mcp_servers()}).success()


def add_mcp_server(payload: dict[str, Any]) -> Result:
    try:
        name = _payload_name(payload)
        config = _read_config()
        servers = config.setdefault(MCP_SERVERS_KEY, {})
        if name in servers:
            raise MCPConfigError(f"MCP server already exists: {name}")
        servers[name] = normalize_mcp_server(name, payload)
        _write_config(config)
        return Result(data={MCP_SERVERS_KEY: servers}).success()
    except Exception as exc:
        return _result_failure(exc)


def update_mcp_server(name: str, payload: dict[str, Any]) -> Result:
    try:
        current_name = _clean_name(name)
        next_name = _payload_name(payload, current_name)
        config = _read_config()
        servers = config.setdefault(MCP_SERVERS_KEY, {})
        if current_name not in servers:
            raise MCPConfigError(f"MCP server not found: {current_name}")
        if next_name != current_name and next_name in servers:
            raise MCPConfigError(f"MCP server already exists: {next_name}")

        merged = {**servers[current_name], **payload}
        servers[next_name] = normalize_mcp_server(next_name, merged)
        if next_name != current_name:
            del servers[current_name]
        _write_config(config)
        return Result(data={MCP_SERVERS_KEY: servers}).success()
    except Exception as exc:
        return _result_failure(exc)


def delete_mcp_server(name: str) -> Result:
    try:
        server_name = _clean_name(name)
        config = _read_config()
        servers = config.setdefault(MCP_SERVERS_KEY, {})
        if server_name not in servers:
            raise MCPConfigError(f"MCP server not found: {server_name}")
        del servers[server_name]
        _write_config(config)
        return Result(data={MCP_SERVERS_KEY: servers}).success()
    except Exception as exc:
        return _result_failure(exc)


def set_mcp_server_enabled(name: str, enabled: bool) -> Result:
    try:
        server_name = _clean_name(name)
        config = _read_config()
        servers = config.setdefault(MCP_SERVERS_KEY, {})
        if server_name not in servers:
            raise MCPConfigError(f"MCP server not found: {server_name}")
        servers[server_name]["enabled"] = bool(enabled)
        _write_config(config)
        return Result(data={MCP_SERVERS_KEY: servers}).success()
    except Exception as exc:
        return _result_failure(exc)


def import_mcp_servers(payload: dict[str, Any]) -> Result:
    try:
        raw_servers = payload.get(MCP_SERVERS_KEY, payload)
        normalized = normalize_mcp_server_config(raw_servers)
        config = _read_config()
        servers = config.setdefault(MCP_SERVERS_KEY, {})
        servers.update(normalized)
        _write_config(config)
        return Result(data={MCP_SERVERS_KEY: servers}).success()
    except Exception as exc:
        return _result_failure(exc)


def build_adapter_server_config(server: dict[str, Any]) -> dict[str, Any]:
    transport = server.get("transport")
    if transport == "stdio":
        return {
            "transport": "stdio",
            "command": server["command"],
            "args": server.get("args", []),
            "env": server.get("env", {}),
        }
    if transport in REMOTE_TRANSPORTS:
        return {
            "transport": transport,
            "url": server["url"],
            "headers": server.get("headers", {}),
        }
    raise MCPConfigError(f"unsupported MCP transport: {transport}")
```

- [ ] **Step 4: Run configuration service tests**

Run:

```powershell
$env:PYTHONPATH="src"; uv run python -m unittest src.test.test_mcp_service_config -v
```

Expected: PASS.

- [ ] **Step 5: Commit configuration service**

```bash
git add src/test/test_mcp_service_config.py src/app/mcp/service/mcp_service.py
git commit -m "feat(mcp): add config service"
```

---

### Task 2: MCP Runtime Service

**Files:**
- Create: `src/test/test_mcp_runtime.py`
- Create: `src/app/mcp/service/mcp_runtime.py`

- [ ] **Step 1: Write failing runtime tests**

Create `src/test/test_mcp_runtime.py`:

```python
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import yaml

from app.mcp.service import mcp_runtime, mcp_service


class FakeTool:
    def __init__(self, name):
        self.name = name


class FakeMCPClient:
    def __init__(self, servers):
        self.servers = servers

    async def get_tools(self):
        name = next(iter(self.servers))
        if name == "bad":
            raise RuntimeError("connection failed")
        return [FakeTool(f"{name}_tool")]


class MCPRuntimeTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.tmp_dir = tempfile.TemporaryDirectory()
        self.config_path = Path(self.tmp_dir.name) / "config.yaml"
        self.original_path = mcp_service.CONFIG_YAML_PATH
        mcp_service.CONFIG_YAML_PATH = str(self.config_path)
        self.config_path.write_text(
            yaml.safe_dump(
                {
                    "mcpServers": {
                        "good": {
                            "enabled": True,
                            "transport": "http",
                            "url": "https://example.com/mcp",
                            "headers": {},
                        },
                        "bad": {
                            "enabled": True,
                            "transport": "stdio",
                            "command": "npx",
                            "args": ["bad-server"],
                            "env": {},
                        },
                        "disabled": {
                            "enabled": False,
                            "transport": "http",
                            "url": "https://disabled.example.com/mcp",
                            "headers": {},
                        },
                    }
                },
                allow_unicode=True,
                sort_keys=False,
            ),
            encoding="utf-8",
        )

    def tearDown(self):
        mcp_service.CONFIG_YAML_PATH = self.original_path
        self.tmp_dir.cleanup()

    async def test_status_marks_connected_error_and_disabled(self):
        with patch.object(mcp_runtime, "MultiServerMCPClient", FakeMCPClient):
            status = await mcp_runtime.get_mcp_status()

        self.assertEqual(status["good"]["state"], "connected")
        self.assertEqual(status["good"]["tool_count"], 1)
        self.assertEqual(status["good"]["tools"], ["good_tool"])
        self.assertEqual(status["bad"]["state"], "error")
        self.assertIn("connection failed", status["bad"]["message"])
        self.assertEqual(status["disabled"]["state"], "disabled")

    async def test_get_mcp_client_skips_failed_and_disabled_servers(self):
        with patch.object(mcp_runtime, "MultiServerMCPClient", FakeMCPClient):
            tools = await mcp_runtime.get_mcp_client()

        self.assertEqual([tool.name for tool in tools], ["good_tool"])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```powershell
$env:PYTHONPATH="src"; uv run python -m unittest src.test.test_mcp_runtime -v
```

Expected: FAIL because `app.mcp.service.mcp_runtime` does not exist.

- [ ] **Step 3: Add runtime service**

Create `src/app/mcp/service/mcp_runtime.py`:

```python
from typing import Any

from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_core.tools import BaseTool
from loguru import logger

from app.mcp.service.mcp_service import (
    build_adapter_server_config,
    get_normalized_mcp_servers,
)


def _tool_names(tools: list[BaseTool]) -> list[str]:
    return [str(getattr(tool, "name", tool)) for tool in tools]


async def _load_server_tools(name: str, server: dict[str, Any]) -> tuple[list[BaseTool], dict[str, Any]]:
    if not server.get("enabled", True):
        return [], {
            "state": "disabled",
            "message": "MCP server is disabled",
            "tool_count": 0,
            "tools": [],
        }

    try:
        adapter_config = build_adapter_server_config(server)
        client = MultiServerMCPClient({name: adapter_config})
        tools = await client.get_tools()
        names = _tool_names(tools)
        return tools, {
            "state": "connected",
            "message": "connected",
            "tool_count": len(tools),
            "tools": names,
        }
    except Exception as exc:
        logger.warning("MCP server '{}' failed to load: {}", name, exc)
        return [], {
            "state": "error",
            "message": str(exc),
            "tool_count": 0,
            "tools": [],
        }


async def get_mcp_status() -> dict[str, dict[str, Any]]:
    servers = get_normalized_mcp_servers()
    status: dict[str, dict[str, Any]] = {}
    for name, server in servers.items():
        _, server_status = await _load_server_tools(name, server)
        status[name] = server_status
    return status


async def get_mcp_client() -> list[BaseTool]:
    servers = get_normalized_mcp_servers()
    tools: list[BaseTool] = []
    for name, server in servers.items():
        server_tools, server_status = await _load_server_tools(name, server)
        if server_status["state"] == "connected":
            tools.extend(server_tools)
    return tools
```

- [ ] **Step 4: Run runtime tests**

Run:

```powershell
$env:PYTHONPATH="src"; uv run python -m unittest src.test.test_mcp_runtime -v
```

Expected: PASS.

- [ ] **Step 5: Commit runtime service**

```bash
git add src/test/test_mcp_runtime.py src/app/mcp/service/mcp_runtime.py
git commit -m "feat(mcp): load runtime tools"
```

---

### Task 3: MCP API Routes

**Files:**
- Create: `src/test/test_mcp_api.py`
- Modify: `src/app/models/req/mcp_req.py`
- Modify: `src/app/api/v1/mcps.py`

- [ ] **Step 1: Write failing API tests**

Create `src/test/test_mcp_api.py`:

```python
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

import yaml
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.mcps import mcpsRouter
from app.mcp.service import mcp_service


class MCPAPITest(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.TemporaryDirectory()
        self.config_path = Path(self.tmp_dir.name) / "config.yaml"
        self.original_path = mcp_service.CONFIG_YAML_PATH
        mcp_service.CONFIG_YAML_PATH = str(self.config_path)
        self.config_path.write_text(
            yaml.safe_dump({"model": {"temperature": 1.0}, "mcpServers": {}}, sort_keys=False),
            encoding="utf-8",
        )
        app = FastAPI()
        app.include_router(mcpsRouter, prefix="/mcp")
        self.client = TestClient(app)

    def tearDown(self):
        mcp_service.CONFIG_YAML_PATH = self.original_path
        self.tmp_dir.cleanup()

    def test_create_list_toggle_delete_server(self):
        create_response = self.client.post(
            "/mcp/servers",
            json={
                "name": "remote",
                "type": "streamable_http",
                "url": "https://example.com/mcp",
            },
        )
        self.assertEqual(create_response.status_code, 200)
        self.assertEqual(create_response.json()["code"], 200)

        with patch(
            "app.api.v1.mcps.mcp_runtime.get_mcp_status",
            new=AsyncMock(return_value={"remote": {"state": "connected", "tool_count": 0, "tools": []}}),
        ):
            list_response = self.client.get("/mcp/servers")

        body = list_response.json()
        self.assertEqual(body["code"], 200)
        server = body["data"]["mcpServers"]["remote"]
        self.assertEqual(server["transport"], "http")
        self.assertEqual(server["status"]["state"], "connected")

        toggle_response = self.client.put("/mcp/servers/remote/enabled", json={"enabled": False})
        self.assertEqual(toggle_response.json()["code"], 200)

        delete_response = self.client.delete("/mcp/servers/remote")
        self.assertEqual(delete_response.json()["code"], 200)

    def test_import_endpoint_merges_servers(self):
        response = self.client.post(
            "/mcp/servers/import",
            json={
                "mcpServers": {
                    "local-fetch": {
                        "command": "npx",
                        "args": ["-y", "mcp-server-fetch"],
                    }
                }
            },
        )

        self.assertEqual(response.json()["code"], 200)
        data = response.json()["data"]["mcpServers"]
        self.assertEqual(data["local-fetch"]["transport"], "stdio")
        self.assertEqual(data["local-fetch"]["command"], "npx")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run API tests and verify they fail**

Run:

```powershell
$env:PYTHONPATH="src"; uv run python -m unittest src.test.test_mcp_api -v
```

Expected: FAIL because the new REST routes and request models do not exist yet.

- [ ] **Step 3: Add request models**

Replace `src/app/models/req/mcp_req.py` with:

```python
from typing import Any

from pydantic import BaseModel, ConfigDict


class McpServerReq(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: str | None = None
    id: str | None = None
    key: str | None = None
    enabled: bool | None = None
    transport: str | None = None
    type: str | None = None
    url: str | None = None
    headers: dict[str, Any] | None = None
    command: str | None = None
    args: list[str] | None = None
    env: dict[str, Any] | None = None
    description: str | None = None

    def to_payload(self) -> dict[str, Any]:
        return self.model_dump(exclude_none=True)


class McpEnabledReq(BaseModel):
    enabled: bool
```

- [ ] **Step 4: Replace MCP API routes**

Replace `src/app/api/v1/mcps.py` with:

```python
from typing import Any

from fastapi import APIRouter

from app.mcp.service import mcp_runtime, mcp_service
from app.models.req.mcp_req import McpEnabledReq, McpServerReq
from common.models.result import Result

mcpsRouter = APIRouter()


def _payload(req: McpServerReq) -> dict[str, Any]:
    return req.to_payload()


async def _servers_with_status() -> Result:
    result = mcp_service.get_mcp_servers()
    if result.code != 200:
        return result

    status = await mcp_runtime.get_mcp_status()
    servers = result.data.get("mcpServers", {})
    enriched = {
        name: {
            "name": name,
            **server,
            "status": status.get(name, {"state": "unknown", "message": "not checked"}),
        }
        for name, server in servers.items()
    }
    return Result(data={"mcpServers": enriched}).success()


@mcpsRouter.get("/servers")
async def get_mcp_servers() -> Result:
    return await _servers_with_status()


@mcpsRouter.post("/servers")
async def create_mcp_server(req: McpServerReq) -> Result:
    return mcp_service.add_mcp_server(_payload(req))


@mcpsRouter.put("/servers/{name}")
async def update_mcp_server(name: str, req: McpServerReq) -> Result:
    return mcp_service.update_mcp_server(name, _payload(req))


@mcpsRouter.delete("/servers/{name}")
async def delete_mcp_server(name: str) -> Result:
    return mcp_service.delete_mcp_server(name)


@mcpsRouter.put("/servers/{name}/enabled")
async def set_mcp_server_enabled(name: str, req: McpEnabledReq) -> Result:
    return mcp_service.set_mcp_server_enabled(name, req.enabled)


@mcpsRouter.post("/servers/import")
async def import_mcp_servers(payload: dict[str, Any]) -> Result:
    return mcp_service.import_mcp_servers(payload)


@mcpsRouter.get("/servers/status")
async def get_mcp_server_status() -> Result:
    return Result(data=await mcp_runtime.get_mcp_status()).success()
```

- [ ] **Step 5: Run API tests**

Run:

```powershell
$env:PYTHONPATH="src"; uv run python -m unittest src.test.test_mcp_api -v
```

Expected: PASS.

- [ ] **Step 6: Commit API routes**

```bash
git add src/test/test_mcp_api.py src/app/models/req/mcp_req.py src/app/api/v1/mcps.py
git commit -m "feat(mcp): add server API"
```

---

### Task 4: Agent Tool Loading Integration

**Files:**
- Modify: `src/app/service/agent_service.py`

- [ ] **Step 1: Update the MCP runtime import**

In `src/app/service/agent_service.py`, replace:

```python
from app.mcp.service.mcp_service import get_mcp_client
```

with:

```python
from app.mcp.service.mcp_runtime import get_mcp_client
```

Keep the existing chat loading call:

```python
tools = await install_tools()
tools.extend(await get_mcp_client())
```

- [ ] **Step 2: Run backend MCP tests**

Run:

```powershell
$env:PYTHONPATH="src"; uv run python -m unittest discover -s src/test -p "test_mcp_*.py" -v
```

Expected: PASS for `test_mcp_service_config`, `test_mcp_runtime`, and `test_mcp_api`.

- [ ] **Step 3: Commit agent integration**

```bash
git add src/app/service/agent_service.py
git commit -m "feat(agent): load connected MCP tools"
```

---

### Task 5: Desktop API Integration

**Files:**
- Modify: `desktop/src/api/navistarApi.js`

- [ ] **Step 1: Update MCP API wrapper paths**

In `desktop/src/api/navistarApi.js`, replace the MCP functions with:

```javascript
export async function fetchMcpServers() {
  const result = await request("/mcp/servers", { method: "GET" });
  return result.data || { mcpServers: {} };
}

export async function createMcpServer(server) {
  return request("/mcp/servers", {
    method: "POST",
    body: JSON.stringify(server),
  });
}

export async function importMcpServers(config) {
  const result = await request("/mcp/servers/import", {
    method: "POST",
    body: JSON.stringify(config),
  });
  return result.data || { mcpServers: {} };
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
  return request(`/mcp/servers/${encodeURIComponent(serverId)}/enabled`, {
    method: "PUT",
    body: JSON.stringify({ enabled }),
  });
}

export async function fetchMcpStatus() {
  const result = await request("/mcp/servers/status", { method: "GET" });
  return result.data || {};
}
```

Remove or stop exporting `testMcpServer` unless it is used elsewhere. If imports break, replace that import with `fetchMcpStatus`.

- [ ] **Step 2: Build frontend**

Run:

```powershell
cd desktop
npm run build
```

Expected: PASS. If it fails because `testMcpServer` was removed while still imported, remove the unused import or replace the call with `fetchMcpStatus`.

- [ ] **Step 3: Commit desktop API integration**

```bash
git add desktop/src/api/navistarApi.js
git commit -m "feat(desktop): use MCP server API"
```

---

### Task 6: MCP Settings Page Status Display

**Files:**
- Modify: `desktop/src/App.jsx`

- [ ] **Step 1: Normalize MCP status objects**

In `desktop/src/App.jsx`, update `normalizeMcpServer` to handle object status responses:

```javascript
function normalizeMcpServer(server = {}, index = 0) {
  const rawName = server.name || server.id || server.key || `mcp-server-${index + 1}`;
  const transport = normalizeMcpTransport(server.transport || server.type || (server.command ? "stdio" : "http"));
  const runtimeStatus =
    server.status && typeof server.status === "object"
      ? server.status
      : { state: server.status || "unknown", message: "" };

  return {
    ...emptyMcpDraft,
    ...server,
    id: server.id || rawName,
    name: rawName,
    transport,
    sourceType: server.type || server.sourceType || (transport === "http" ? "streamable_http" : transport),
    args: Array.isArray(server.args) ? server.args.join(" ") : server.args || "",
    env: typeof server.env === "string" ? server.env : stringifyKeyValueBlock(server.env),
    headers: typeof server.headers === "string" ? server.headers : stringifyKeyValueBlock(server.headers),
    enabled: server.enabled ?? true,
    status: runtimeStatus,
    toolCount: runtimeStatus.tool_count ?? runtimeStatus.toolCount ?? 0,
    statusMessage: runtimeStatus.message || "",
  };
}
```

- [ ] **Step 2: Remove unsupported WebSocket from transport choices**

In `mcpTransports`, remove:

```javascript
{ value: "websocket", label: "WebSocket", hint: "ws" },
```

In `normalizeMcpTransport`, remove the mappings:

```javascript
websocket: "websocket",
ws: "websocket",
```

- [ ] **Step 3: Add status formatting helpers**

Add these helpers near the other MCP helper functions:

```javascript
function getMcpStatusState(server) {
  return server.status?.state || "unknown";
}

function formatMcpStatus(server) {
  const state = getMcpStatusState(server);
  if (!server.enabled || state === "disabled") return "已禁用";
  if (state === "connected") return `已连接 · ${server.toolCount || 0} 个工具`;
  if (state === "error") return `连接失败：${server.statusMessage || "请检查配置"}`;
  return "状态未知";
}

function getMcpStatusClass(server) {
  const state = getMcpStatusState(server);
  if (!server.enabled || state === "disabled") return "text-[#777d7a]";
  if (state === "connected") return "text-[#2f6f45]";
  if (state === "error") return "text-[#b1423d]";
  return "text-[#777d7a]";
}
```

- [ ] **Step 4: Render per-server status in the MCP list**

In the server list item, replace:

```jsx
<span className="truncate text-sm font-semibold text-[#1f2322]">{server.name}</span>
```

with:

```jsx
<div className="min-w-0">
  <span className="block truncate text-sm font-semibold text-[#1f2322]">{server.name}</span>
  <span className={cn("mt-0.5 block truncate text-[11px]", getMcpStatusClass(server))} title={formatMcpStatus(server)}>
    {formatMcpStatus(server)}
  </span>
</div>
```

- [ ] **Step 5: Refresh server list after mutations**

Inside `McpSettingsPage`, add:

```javascript
async function refreshServers(nextStatus = "已同步") {
  const data = await fetchMcpServers();
  const items = normalizeMcpServerList(data);
  setServers(items.length ? items : []);
  setApiStatus(items.length ? nextStatus : "暂无服务器");
}
```

Then update mutation handlers:

```javascript
await updateMcpServer(nextServer.id, payload);
await refreshServers("已保存");
```

```javascript
const data = await importMcpServers(config);
const items = normalizeMcpServerList(data);
setServers(items.length ? items : []);
setApiStatus("已导入");
```

```javascript
await deleteMcpServer(serverId);
await refreshServers("已删除");
```

```javascript
await toggleMcpServer(server.id, enabled);
await refreshServers(enabled ? "已启用" : "已关闭");
```

- [ ] **Step 6: Build frontend**

Run:

```powershell
cd desktop
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit settings page status display**

```bash
git add desktop/src/App.jsx
git commit -m "feat(desktop): show MCP runtime status"
```

---

### Task 7: Full Verification

**Files:**
- Verify only; no file changes expected.

- [ ] **Step 1: Run backend MCP tests**

Run:

```powershell
$env:PYTHONPATH="src"; uv run python -m unittest discover -s src/test -p "test_mcp_*.py" -v
```

Expected: all MCP tests PASS.

- [ ] **Step 2: Run frontend build**

Run:

```powershell
cd desktop
npm run build
```

Expected: PASS with Vite production build output.

- [ ] **Step 3: Run backend server for API smoke**

Run:

```powershell
uv run uvicorn main:app --app-dir src --host 127.0.0.1 --port 8000
```

Expected: Uvicorn starts and logs that it is serving on `http://127.0.0.1:8000`.

- [ ] **Step 4: Smoke test MCP endpoints**

In a separate terminal, run:

```powershell
Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8000/mcp/servers"
```

Expected: JSON with `code: 200` and `data.mcpServers`.

Run:

```powershell
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/mcp/servers/import" -ContentType "application/json" -Body '{"mcpServers":{"bing-cn-mcp-server":{"type":"streamable_http","url":"https://mcp.api-inference.modelscope.net/5f71b785bb1a47/mcp"}}}'
```

Expected: JSON with `code: 200`. In `src/resources/config.yaml`, the imported server has `transport: http`, not `type: streamable_http`.

- [ ] **Step 5: Verify runtime status is not persisted**

Open `src/resources/config.yaml` and confirm the server config does not contain:

```yaml
status:
error:
tool_count:
tools:
```

Expected: none of those runtime fields are present.

- [ ] **Step 6: Final commit if verification-only fixes were needed**

If verification required fixes, commit only the files changed by that fix with a concrete `git add` command naming those files. Use this commit message:

```bash
git commit -m "fix(mcp): complete verification fixes"
```

If no fixes were needed, do not create an empty commit.
