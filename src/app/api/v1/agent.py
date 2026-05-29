"""
Agent Chat API 路由。

定义所有面向前端的 REST 接口：
  - /chat/send/stream  — 流式对话（SSE）
  - /chat/query        — 查询历史消息
  - /chat/del          — 删除对话
  - /chat/query_list   — 会话列表
  - /chat/model_list   — 可用模型列表
  - /skills            — 技能目录
  - /mcp/status        — MCP 服务状态
  - /files/{id}/download — 文件下载
  - /files/upload      — 文件上传
  - /settings          — 设置读写
"""

from fastapi import APIRouter, File, UploadFile
from loguru import logger
from starlette.responses import StreamingResponse

from app.models.req.agent_req import AgentReq
from app.models.req.query_req import QueryReq
from app.models.resp.query_resp import ConversationList, QueryResp
from app.service.agent_service import chat_stream, chat_delete, chat_query, chat_conversation_list, chat_model_list
from common.models.result import Result

agentRouter = APIRouter()


@agentRouter.post("/chat/send/stream")
async def get_chat_stream(req: AgentReq):
    return StreamingResponse(await chat_stream(req), media_type="text/html")


@agentRouter.post("/chat/query")
async def get_chat_query(req: QueryReq) -> Result:
    if not req.thread_id:
        return Result(msg="Thread id is required.").failure()

    return await chat_query(req.thread_id)


@agentRouter.post("/chat/del")
async def del_chat_query(req: QueryReq) -> Result:
    if not req.thread_id:
        return Result(msg="Thread id is required.").failure()

    return await chat_delete(req.thread_id)


@agentRouter.get("/chat/query_list")
async def get_chat_conversation_list() -> QueryResp:
    result = await chat_conversation_list()

    if result.code != 200:
        return QueryResp(code=result.code, msg=result.msg)

    conversation_list: list[ConversationList] = result.data
    logger.info(f"[chat/query_list] return {len(conversation_list)} conversations")

    return QueryResp(code=200, msg="Chat conversation list query succeeded.", data=conversation_list)


@agentRouter.post("/chat/model_list")
async def get_chat_model_list() -> Result:
    """
    返回模型列表
    """
    return await chat_model_list()


# @agentRouter.get("/skills")
# async def get_skills(include_mcp: bool = True) -> Result:
#     return await get_skill_catalog(include_mcp=include_mcp)


# @agentRouter.get("/mcp/status")
# async def get_mcp_client_status() -> Result:
#     return await get_mcp_status()


# @agentRouter.get("/files/{file_id}/download")
# async def download_generated_file(file_id: str):
#     return build_file_response(file_id)


# @agentRouter.post("/files/upload")
# async def upload_files(files: list[UploadFile] = File(...)) -> Result:
#     if not files:
#         return Result(msg="请选择要上传的文件").failure()
#
#     uploaded_files = await save_uploaded_files(files)
#     logger.info("[files/upload] saved {} files", len(uploaded_files))
#     return Result(data={"files": uploaded_files}, msg="文件上传成功").success()



#
#
# @agentRouter.post("/settings")
# async def update_app_settings(req: SettingsReq) -> Result:
#     return await update_settings(req)
