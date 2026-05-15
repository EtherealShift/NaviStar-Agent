from fastapi import APIRouter
from starlette.responses import StreamingResponse

from app.models.req.agent_req import AgentReq
from app.service.agent_service import chat_stream

agentRouter = APIRouter()



@agentRouter.post("/chat/stream")
async def get_chat_stream(req: AgentReq):
    return StreamingResponse(await chat_stream(req), media_type="text/html")