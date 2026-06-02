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
