import mimetypes
from pathlib import Path

import yaml

from common.config.constants import SUPPLIER_YAML_PATH

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




def supplier_yaml_path():
    with open(SUPPLIER_YAML_PATH, 'r', encoding='utf-8') as file:  # SUPPLIER_YAML_PATH is a constant from a module
        data = yaml.safe_load(file)
    return data





if __name__ == "__main__":
    # print(document_type(r"D:\work\PythonProjects\NaviStar-Agent\CLAUDE.md"))
    print(supplier_yaml_path())
