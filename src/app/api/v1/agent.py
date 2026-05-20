from fastapi import APIRouter, Request
from starlette.responses import StreamingResponse
from loguru import logger

from app.models.req.agent_req import AgentReq
from app.models.req.query_req import QueryReq
from app.models.req.settings_req import SettingsReq
from app.models.resp.query_resp import ConversationList, QueryResp
from app.service.agent_service import chat_stream, chat_delete, chat_query, chat_conversation_list, chat_model_list
from app.service.settings_service import get_settings, update_settings
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


@agentRouter.get("/settings")
async def get_app_settings() -> Result:
    return await get_settings()


@agentRouter.post("/settings")
async def update_app_settings(req: SettingsReq) -> Result:
    return await update_settings(req)
