from agent.models.state import MultiAgentState
from common.agents import build_researcher, build_writer, build_reviewer

# ── 预创建 Agent 实例（模块级，避免每次调用重新创建） ──
researcher = build_researcher()
writer = build_writer()
reviewer = build_reviewer()

# ── 打回计数器（模块级变量，简单防无限循环） ──
_review_rounds: dict[str, int] = {}


def researcher_node(state: MultiAgentState) -> dict:
    """
    研究者节点。

    输入：state["messages"]（用户的原始问题）
    处理：调用子 Agent，自动使用搜索工具
    输出：子 Agent 生成的完整消息 + 路由标记 "writer"
    """
    result = researcher.invoke({"messages": state["messages"]})

    return {
        "messages": result["messages"],
        "next_agent": "writer",
    }


def writer_node(state: MultiAgentState) -> dict:
    """
    写手节点。

    输入：state["messages"]（包含用户问题 + 研究者结论）
    处理：子 Agent 组织信息、撰写报告
    输出：子 Agent 生成的消息 + 路由标记 "reviewer"
    """
    result = writer.invoke({"messages": state["messages"]})

    return {
        "messages": result["messages"],
        "next_agent": "reviewer",
    }


def reviewer_node(state: MultiAgentState) -> dict:
    """
    审核节点。

    输入：state["messages"]（包含用户问题 + 研究结论 + 报告）
    处理：审查报告质量
    输出：通过 → "end"；不通过 → "writer"（打回重写）
    """
    result = reviewer.invoke({"messages": state["messages"]})

    last_msg = result["messages"][-1].content

    if "审核通过" in last_msg:
        return {
            "messages": result["messages"],
            "next_agent": "end",
        }
    else:
        # 打回重写，带修改意见
        return {
            "messages": result["messages"],
            "next_agent": "writer",
        }