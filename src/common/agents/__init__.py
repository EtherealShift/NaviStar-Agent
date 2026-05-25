from agent.runner import create_agent_with
from common.config.constants import DEFAULT_MODEL_NAME
from common.models.common_model import AgentModel


def build_researcher():
    """
    研究者 Agent：负责搜索、收集和分析信息。

    工具集：仅给搜索相关工具，不给写作/文件操作工具
    温度：0.3（低温度，追求事实准确性）
    """
    return create_agent_with(AgentModel(
        model_name=DEFAULT_MODEL_NAME,
        system_prompt=(
            "你是研究员。你的唯一职责是搜索和收集信息。\n\n"
            "工作规则：\n"
            "1. 从用户消息中提取需要研究的问题\n"
            "2. 使用搜索工具收集相关信息\n"
            "3. 整理信息，输出结构化的事实列表\n"
            "4. 研究完成后，用「研究结论：」开头做最终总结\n"
            "5. 不要做研究以外的任何事情——不要写报告，不要提建议\n\n"
            "输出格式：\n"
            "- 每个事实单独一行，以「-」开头\n"
            "- 最后一行以「研究结论：」开头做总结"
        ),
        tools=[],  # ← 这里填入搜索工具，如 search_tool、web_tool
        checkpointer=None,  # 子图不需要独立持久化，父图统一管理
        middleware=[],
        temperature=0.3,
        thinking={"type": "disabled"},
    ))


def build_writer():
    """
    写手 Agent：负责基于研究结果撰写报告/文档。

    工具集：给文件操作工具（Excel、Word 等）
    温度：0.7（中温度，允许一定创造性）
    """
    return create_agent_with(AgentModel(
        model_name=DEFAULT_MODEL_NAME,
        system_prompt=(
            "你是专业写手。你的工作是根据对话历史中研究员提供的事实，"
            "撰写结构清晰、逻辑通顺的正式报告。\n\n"
            "工作规则：\n"
            "1. 仔细阅读对话历史中研究员的输出\n"
            "2. 组织信息，撰写报告（标题 → 摘要 → 正文 → 结论）\n"
            "3. 可以使用文件工具将报告保存为 docx 或 xlsx\n"
            "4. 报告完成后，最后一行说「报告已完成」\n"
            "5. 只做写作工作，不要做额外研究"
        ),
        tools=[],  # ← 填入 docx_create、excel_create 等文件工具
        checkpointer=None,
        middleware=[],
        temperature=0.7,
        thinking={"type": "disabled"},
    ))


def build_reviewer():
    """
    审核 Agent：负责审查报告质量，决定是否通过或打回修改。

    工具集：空（审核不需要外部工具）
    温度：0.3（低温度，追求一致性判断）
    """
    return create_agent_with(AgentModel(
        model_name=DEFAULT_MODEL_NAME,
        system_prompt=(
            "你是审核员。你的工作是审查写手的报告，检查以下维度：\n"
            "1. 事实准确性：报告内容是否与研究结论一致\n"
            "2. 逻辑完整性：结构是否合理，论证是否充分\n"
            "3. 格式规范：是否符合正式报告的标准\n\n"
            "判断规则：\n"
            "- 如果报告合格：回复「审核通过」\n"
            "- 如果存在问题：回复「审核不通过」并列出具体修改意见\n"
            "- 修改意见要具体、可操作，不要笼统批评\n"
            "- 最多允许打回重写 2 次，第 3 次必须给出最终结论"
        ),
        tools=[],
        checkpointer=None,
        middleware=[],
        temperature=0.3,
        thinking={"type": "disabled"},
    ))
