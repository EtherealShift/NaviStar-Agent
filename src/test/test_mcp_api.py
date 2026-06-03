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
        self.app = FastAPI()
        self.app.include_router(mcpsRouter, prefix="/mcp")
        self.client = TestClient(self.app)

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

    def test_list_servers_returns_error_status_when_runtime_status_fails(self):
        create_response = self.client.post(
            "/mcp/servers",
            json={
                "name": "remote",
                "type": "streamable_http",
                "url": "https://example.com/mcp",
            },
        )
        self.assertEqual(create_response.json()["code"], 200)

        non_raising_client = TestClient(self.app, raise_server_exceptions=False)
        with patch(
            "app.api.v1.mcps.mcp_runtime.get_mcp_status",
            new=AsyncMock(side_effect=RuntimeError("status unavailable")),
        ):
            response = non_raising_client.get("/mcp/servers")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["code"], 200)
        status = body["data"]["mcpServers"]["remote"]["status"]
        self.assertEqual(
            status,
            {"state": "error", "message": "status unavailable", "tool_count": 0, "tools": []},
        )

    def test_list_servers_returns_failure_for_malformed_config(self):
        self.config_path.write_text(
            yaml.safe_dump({"model": {"temperature": 1.0}, "mcpServers": []}, sort_keys=False),
            encoding="utf-8",
        )

        with patch("app.api.v1.mcps.mcp_runtime.get_mcp_status", new=AsyncMock()) as status_mock:
            response = self.client.get("/mcp/servers")

        body = response.json()
        self.assertEqual(body["code"], 400)
        self.assertEqual(body["msg"], "mcpServers must be an object")
        status_mock.assert_not_awaited()

    def test_status_endpoint_returns_failure_when_status_lookup_fails(self):
        non_raising_client = TestClient(self.app, raise_server_exceptions=False)
        with patch(
            "app.api.v1.mcps.mcp_runtime.get_mcp_status",
            new=AsyncMock(side_effect=RuntimeError("status unavailable")),
        ):
            response = non_raising_client.get("/mcp/servers/status")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["code"], 400)
        self.assertEqual(body["msg"], "status unavailable")


if __name__ == "__main__":
    unittest.main()
