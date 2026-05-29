import mimetypes

_Images = ["png", "jpg", "jpeg", "gif", "bmp"]

_PlainTextContent = ["txt", "md"]

class FileModel:
    """
    文件类型
    """
    file_path: str

    mime_type: str

    url: str

    base64: str

class MimeModel:
    """
    mime类型
    """

    file_type: str

    mime_type: str

    file_path: str


    def __init__(self, file_path: str):
        self.file_path = file_path

        match file_path:
            case _ if file_path.endswith(tuple(_PlainTextContent)):
                self.file_type = "plaintext"
                self.mime_type = mimetypes.MimeTypes().guess_type(file_path)[0] or "application/octet-stream"
            case _ if file_path.endswith(tuple(_Images)):
                self.file_type = "image"
                self.mime_type = mimetypes.MimeTypes().guess_type(file_path)[0] or "application/octet-stream"
            case _:
                self.file_type = "unknown"
                self.mime_type = "application/octet-stream"



        # def document_type(file_path: str):
        #     """
        #     判断文件类型
        #     """
        #     match file_path:
        #         case _ if file_path.endswith(tuple(_PlainTextContent)):
        #             return "plaintext", mimetypes.MimeTypes().guess_type(file_path)[0]
        #         case _ if file_path.endswith(tuple(_Images)):
        #             return "image", mimetypes.MimeTypes().guess_type(file_path)[0]
        #         # case _ if file_path.endswith(".pdf"):
        #         #     return "pdf", mimetypes.MimeTypes().guess_type(file_path)[0]
        #         # case _ if file_path.endswith(".doc"):
        #         #     return "doc", mimetypes.MimeTypes().guess_type(file_path)[0]
        #         # case _ if file_path.endswith(".docx"):
        #         #     return "docx", mimetypes.MimeTypes().guess_type(file_path)[0]
        #         # case _ if file_path.endswith(".xls"):
        #         #     return "xls", mimetypes.MimeTypes().guess_type(file_path)[0]
        #         # case _ if file_path.endswith(".xlsx"):
        #         #     return "xlsx", mimetypes.MimeTypes().guess_type(file_path)[0]
        #         case _:
        #             return "unknown", None