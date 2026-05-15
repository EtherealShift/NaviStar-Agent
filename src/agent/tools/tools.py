"""
Agent 可调用的工具注册

  LangGraph Agent 通过 "工具" 与外部世界交互。
  每个用 @tool 装饰的函数就是一个 Agent 可以调用的能力，
  install_tools() 把所有工具收集起来交给 Agent。

当前工具清单：
  1. tavily_search  → 网络搜索（Tavily API）
  2. get_geocode    → 城市名查经纬度（Open-Meteo）
  3. get_weather    → 城市名查天气预报（uapis.cn，支持国内城市）
"""

from typing import Any

from langchain_core.tools import tool, BaseTool
from langchain_tavily import TavilySearch

from common.utils.tool_utils import geocode_city, get_weather_city


@tool(description="用于查询城市经纬度信息")
async def get_geocode(
    name: str, country: str | None = None, language: str = "zh"
) -> dict[str, Any]:
    return await geocode_city(name=name, country=country, language=language)


@tool(description="用于查询城市天气，支持多天查询。adcode 按行政区编码查询（优先级最高），city 按城市名称查询")
async def get_weather(city: str, adcode: str = ""):
    return await get_weather_city(city, adcode=adcode)


async def install_tools() -> list[BaseTool]:
    """收集所有工具，供 Agent 使用。"""
    return [
        get_geocode,
        get_weather,
    ]


def get_network_tools(tools: list[BaseTool]):
    tools.append(
        TavilySearch(max_results=5, topic="general")
    )
