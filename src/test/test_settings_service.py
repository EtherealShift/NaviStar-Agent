import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import yaml

from app.models.req.settings_req import SettingsReq
from app.service import settings_service


class SettingsServiceTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.tmp_dir = tempfile.TemporaryDirectory()
        self.config_path = Path(self.tmp_dir.name) / "config.yaml"
        self.config_path.write_text(
            yaml.safe_dump(
                {
                    "model": {
                        "temperature": 0.6,
                        "reasoning_effort": "medium",
                        "supplier": "deepseek",
                        "model_name": "deepseek-v4-flash",
                    },
                    "mcpServers": {
                        "remote": {
                            "enabled": True,
                            "transport": "http",
                            "url": "https://example.com/mcp",
                            "headers": {},
                        }
                    },
                },
                allow_unicode=True,
                sort_keys=False,
            ),
            encoding="utf-8",
        )

    def tearDown(self):
        self.tmp_dir.cleanup()

    async def test_update_settings_preserves_mcp_servers(self):
        def read_temp_config():
            return yaml.safe_load(self.config_path.read_text(encoding="utf-8"))

        with (
            patch.object(settings_service, "CONFIG_YAML_PATH", str(self.config_path)),
            patch.object(settings_service, "config_yaml_path", read_temp_config),
        ):
            result = await settings_service.update_settings(
                SettingsReq(
                    temperature=1.0,
                    reasoning_effort="high",
                    supplier="deepseek",
                    model_name="deepseek-v4-pro",
                )
            )

        self.assertEqual(result.code, 200)
        config = yaml.safe_load(self.config_path.read_text(encoding="utf-8"))
        self.assertEqual(config["model"]["temperature"], 1.0)
        self.assertEqual(config["model"]["reasoning_effort"], "high")
        self.assertIn("remote", config["mcpServers"])
        self.assertEqual(config["mcpServers"]["remote"]["transport"], "http")


if __name__ == "__main__":
    unittest.main()
