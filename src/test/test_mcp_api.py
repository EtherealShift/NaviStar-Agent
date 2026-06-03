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
