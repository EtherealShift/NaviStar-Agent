from fastapi import APIRouter, Request
from starlette.responses import StreamingResponse
from loguru import logger

from app.models.req.agent_req import AgentReq
from app.models.req.query_req import QueryReq
from app.models.resp.query_resp import ConversationList, QueryResp
from app.service.agent_service import chat_stream, chat_delete, chat_query, chat_conversation_list
from common.models.result import Result

agentRouter = APIRouter()


@agentRouter.post("/chat/send/stream")
async def get_chat_stream(req: AgentReq):
    # client_host = request.client.host if request.client else "unknown"
    # logger.info(
    #     f"[chat/stream] client={client_host} thread_id={req.thread_id} "
    #     f"model={req.model_name} thinking={req.thinking} network={req.is_network}"
    # )
    return StreamingResponse(await chat_stream(req), media_type="text/html")


@agentRouter.post("/chat/query")
async def get_chat_query(req: QueryReq) -> Result:
    # client_host = request.client.host if request.client else "unknown"
    # logger.info(f"[chat/query] client={client_host} thread_id={req.thread_id}")
    if not req.thread_id:
        logger.warning("[chat/query] thread_id is empty")
        return Result(msg="Thread id is required.").failure()

    return await chat_query(req.thread_id)


@agentRouter.post("/chat/del")
async def del_chat_query(req: QueryReq) -> Result:
    # client_host = request.client.host if request.client else "unknown"
    # logger.info(f"[chat/del] client={client_host} thread_id={req.thread_id}")
    if not req.thread_id:
        logger.warning("[chat/del] thread_id is empty")
        return Result(msg="Thread id is required.").failure()

    return await chat_delete(req.thread_id)


@agentRouter.get("/chat/query_list")
async def get_chat_conversation_list() -> QueryResp:
    # client_host = request.client.host if request.client else "unknown"
    # logger.info(f"[chat/query_list] client={client_host}")
    result = await chat_conversation_list()

    if result.code != 200:
        logger.error(f"[chat/query_list] failed: {result.msg}")
        return QueryResp(code=result.code, msg=result.msg)

    conversation_list: list[ConversationList] = result.data
    logger.info(f"[chat/query_list] return {len(conversation_list)} conversations")

    return QueryResp(code=200, msg="Chat conversation list query succeeded.", data=conversation_list)




