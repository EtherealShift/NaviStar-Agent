from fastapi import APIRouter
from starlette.responses import StreamingResponse

from app.models.req.agent_req import AgentReq
from app.models.req.query_req import QueryReq
from app.models.resp.query_resp import ConversationList, QueryResp
from app.service.agent_service import chat_stream, chat_delete, chat_query, chat_conversation_list
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
    result =  await chat_conversation_list()

    if result.code != 200:
        return QueryResp(code=result.code, msg=result.msg)

    conversation_list: list[ConversationList] = result.data


    return QueryResp(code=200, msg="Chat conversation list query succeeded.", data=conversation_list)




