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

    def test_getters_normalize_loaded_alias_configs(self):
        self.write_config(
            {
                "model": {"temperature": 0.6},
                "mcpServers": {
                    "remote": {
                        "type": "streamable_http",
                        "url": "https://example.com/mcp",
                    },
                },
            }
        )

        servers = mcp_service.get_normalized_mcp_servers()
        result = mcp_service.get_mcp_servers()

        self.assertEqual(result.code, 200)
        self.assertEqual(result.data["mcpServers"], servers)
        remote = servers["remote"]
        self.assertEqual(remote.get("transport"), "http")
        self.assertEqual(remote.get("headers"), {})
        self.assertTrue(remote["enabled"])
        self.assertNotIn("type", remote)

    def test_get_mcp_servers_returns_failure_for_malformed_saved_config(self):
        self.write_config(
            {
                "model": {"temperature": 0.6},
                "mcpServers": {
                    "broken": {
                        "transport": "http",
                    },
                },
            }
        )

        result = mcp_service.get_mcp_servers()

        self.assertEqual(result.code, 400)
        self.assertIn("broken: http transport requires url", result.msg)

    def test_normalize_rejects_duplicate_cleaned_names(self):
        with self.assertRaises(mcp_service.MCPConfigError) as context:
            mcp_service.normalize_mcp_server_config(
                {
                    "foo": {"command": "npx"},
                    " foo ": {"command": "uvx"},
                }
            )

        self.assertIn("duplicate MCP server name: foo", str(context.exception))


if __name__ == "__main__":
    unittest.main()
