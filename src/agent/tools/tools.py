"""
Agent 可调用的工具注册

  LangGraph Agent 通过 "工具" 与外部世界交互。
  每个用 @tool 装饰的函数就是一个 Agent 可以调用的能力，
  install_tools() 把所有工具收集起来交给 Agent。
"""
import asyncio
from typing import Any
import os

import requests
from ddgs import DDGS

from langchain_core.tools import tool, BaseTool
from langchain_tavily import TavilySearch
from loguru import logger

from agent.tools.excel_agent_tool import excel_agent
from app.tools.captured_tools import douyin_fetch_video_detail, douyin_fetch_video_list
from common.config.settings_config import load_runtime_settings
from common.config.constants import ENV_TAVILY_API_KEY
from common.utils.tool_utils import geocode_city, get_weather_city


@tool(description="用于查询城市经纬度信息")
async def get_geocode(
    name: str, country: str | None = None, language: str = "zh"
) -> dict[str, Any]:
    return await geocode_city(name=name, country=country, language=language)


@tool(description="用于查询城市天气，支持多天查询。adcode 按行政区编码查询（优先级最高），city 按城市名称查询")
async def get_weather(city: str, adcode: str = ""):
    return await get_weather_city(city, adcode=adcode)


@tool(description="用于获取用户当前的地理位置, ip为空则获取当前公网IP位置")
async def get_location_by_ip(ip=""):
    url = f"http://ip-api.com/json/{ip}"
    res = requests.get(url)
    data = res.json()
    return {
        "国家": data.get("country"),
        "城市": data.get("city"),
        "经纬度": (data.get("lat"), data.get("lon"))
    }

@tool(description="网络搜索工具。输入搜索关键词，返回搜索结果（标题、URL、摘要）。")
async def web_search_text(query: str, max_results: int = 10) -> str:

    """搜索网络并返回结果"""
    try:
        results = await asyncio.to_thread(_sync_search_text, query, max_results)

        if not results:
            return f'未找到与 "{query}" 相关的结果。'

        output = []
        for i, r in enumerate(results, 1):
            output.append(
                f"{i}. {r.get('title', '无标题')}\n"
                f"   URL: {r.get('href', '无链接')}\n"
                f"   摘要: {r.get('body', '无摘要')}"
            )

        logger.info(f"[WebSearch] 查询: {query}, 返回 {len(results)} 条")
        return "\n\n".join(output)

    except Exception as e:
        logger.error(f"[WebSearch] 搜索失败: {e}")
        return f"搜索失败: {e}"

def _sync_search_text(query: str, max_results: int) -> list:
    with DDGS() as ddgs:
        return list(ddgs.text(query, max_results=max_results, region="zh-cn", safesearch="on"))


async def install_tools() -> list[BaseTool]:
    """收集所有工具，供 Agent 使用。"""
    return [
        get_geocode,
        get_weather,
        get_location_by_ip,
        douyin_fetch_video_detail,
        douyin_fetch_video_list,
        excel_agent,
        web_search_text,
    ]


def get_network_tools(tools: list[BaseTool]) -> list[BaseTool]:
    load_runtime_settings()
    if not os.getenv(ENV_TAVILY_API_KEY):
        raise RuntimeError("Tavily API Key 未配置，请先在设置中填写联网搜索 Key。")
    tools.append(
        TavilySearch(max_results=5, topic="general"),
    )
    return tools



# if __name__ == "__main__":
    # if __name__ == "__main__":
    #     async def main():
    #         results = await asyncio.gather(
    #             web_search_text("虹猫", max_results=20),
    #             web_search_text("蓝兔", max_results=25),
    #             web_search_text("黑小虎", max_results=5),
    #         )
    #         for r in results:
    #             print(r)
    #
    #
    #     asyncio.run(main())

