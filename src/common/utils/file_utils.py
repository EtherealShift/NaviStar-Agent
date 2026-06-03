import mimetypes
import os
from copy import deepcopy

import yaml

from common.config.constants import CONFIG_YAML_PATH

DEFAULT_CONFIG = {
    "model": {
        "model_name": "deepseek-v4-flash",
        "reasoning_effort": "medium",
        "supplier": "deepseek",
        "temperature": 1.0,
    },
    "mcpServers": {},
}

_Images = ["png", "jpg", "jpeg", "gif", "bmp"]

_PlainTextContent = ["txt", "md"]


def document_type(file_path: str) :
    """
    判断文件类型
    """
    match file_path:
        case _ if file_path.endswith(tuple(_PlainTextContent)):
            return "plaintext", mimetypes.MimeTypes().guess_type(file_path)[0]
        case _ if file_path.endswith(tuple(_Images)):
            return "image", mimetypes.MimeTypes().guess_type(file_path)[0]
        # case _ if file_path.endswith(".pdf"):
        #     return "pdf", mimetypes.MimeTypes().guess_type(file_path)[0]
        # case _ if file_path.endswith(".doc"):
        #     return "doc", mimetypes.MimeTypes().guess_type(file_path)[0]
        # case _ if file_path.endswith(".docx"):
        #     return "docx", mimetypes.MimeTypes().guess_type(file_path)[0]
        # case _ if file_path.endswith(".xls"):
        #     return "xls", mimetypes.MimeTypes().guess_type(file_path)[0]
        # case _ if file_path.endswith(".xlsx"):
        #     return "xlsx", mimetypes.MimeTypes().guess_type(file_path)[0]
        case _:
            return "unknown", None


def load_config():
    with open(CONFIG_YAML_PATH, "r", encoding="utf-8") as f:
       return yaml.safe_load(f)


def config_yaml_path():
    """
    读取 config.yaml，若文件不存在则先初始化默认配置。
    """
    init_config_yaml()
    return load_config() or deepcopy(DEFAULT_CONFIG)



def init_config_yaml():
    """
    初始化配置文件，若配置文件不存在则使用默认配置
    """
    if not os.path.exists(CONFIG_YAML_PATH):
        # 配置config.yaml文件
        with open(CONFIG_YAML_PATH, "w", encoding="utf-8") as file:
            yaml.safe_dump(DEFAULT_CONFIG, file, allow_unicode=True, sort_keys=False)

