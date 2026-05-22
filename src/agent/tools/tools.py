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
import os

import requests
from langchain_core.tools import tool, BaseTool
from langchain_tavily import TavilySearch

from app.tools.captured_tools import douyin_fetch_video_detail, douyin_fetch_video_list
from common.config.settings_config import load_runtime_settings
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

async def install_tools() -> list[BaseTool]:
    """收集所有工具，供 Agent 使用。"""
    return [
        get_geocode,
        get_weather,
        get_location_by_ip,
        douyin_fetch_video_detail,
        douyin_fetch_video_list
    ]


def get_network_tools(tools: list[BaseTool]) -> list[BaseTool]:
    load_runtime_settings()
    if not os.getenv("TAVILY_API_KEY"):
        raise RuntimeError("Tavily API Key 未配置，请先在设置中填写联网搜索 Key。")
    tools.append(
        TavilySearch(max_results=5, topic="general")
    )
    return tools
