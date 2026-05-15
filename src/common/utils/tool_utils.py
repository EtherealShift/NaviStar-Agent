"""
外部 API 调用工具

为什么需要这个模块？
  Agent 的工具需要调用真实的外部 API 获取数据（天气、地理编码等），
  这里把 HTTP 调用封装为纯函数，供 tools.py 中的 @tool 函数使用。

数据源：
  - Open-Meteo（免费，无需 API Key）：地理编码 + 经纬度天气
  - uapis.cn（国内天气，支持城市名/行政区编码查询）
"""

from typing import Any

import httpx
from uapi.client import UapiClient, UapiError

OPEN_METEO_GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
OPEN_METEO_WEATHER_URL = "https://api.open-meteo.com/v1/forecast"

_http: httpx.AsyncClient | None = None


def _http_client() -> httpx.AsyncClient:
    """懒初始化的 HTTP 客户端单例，复用连接避免重复创建。"""
    global _http
    if _http is None or _http.is_closed:
        _http = httpx.AsyncClient(timeout=10)
    return _http


# ── Open-Meteo：地理编码 ──────────────────────────────────────────────

async def geocode_city(
    name: str, country: str | None = None, language: str = "zh"
) -> dict[str, Any]:
    """城市名 → 经纬度（调用 Open-Meteo Geocoding API）"""
    params = {"name": name, "count": 1, "language": language, "format": "json"}
    if country:
        params["country"] = country

    r = await _http_client().get(OPEN_METEO_GEOCODE_URL, params=params)
    r.raise_for_status()
    results = r.json().get("results") or []

    if not results:
        return {"error": f"未找到城市名:{name}"}

    top = results[0]
    return {
        "name": top.get("name"),
        "lat": top.get("latitude"),
        "lon": top.get("longitude"),
        "country": top.get("country"),
    }


# ── Open-Meteo：经纬度天气 ────────────────────────────────────────────

async def get_current_weather(lat: float, lon: float) -> dict[str, Any]:
    """经纬度 → 当前天气（调用 Open-Meteo Forecast API）"""
    r = await _http_client().get(
        OPEN_METEO_WEATHER_URL,
        params={"latitude": lat, "longitude": lon, "current_weather": True},
    )
    r.raise_for_status()
    cw = r.json().get("current_weather") or {}

    return {
        "latitude": lat,
        "longitude": lon,
        "temperature": cw.get("temperature"),
        "windspeed": cw.get("windspeed"),
        "weathercode": cw.get("weathercode"),
        "time": cw.get("time"),
    }


# ── uapis.cn：国内城市天气 ────────────────────────────────────────────

async def get_weather_city(
    city: str, adcode: str = "", language: str = "zh"
) -> Any | None:
    """城市名/行政区编码 → 天气预报（调用 uapis.cn）"""
    client = UapiClient("https://uapis.cn")
    try:
        return client.misc.get_misc_weather(
            city=city, adcode=adcode, extended=False,
            forecast=True, hourly=False, minutely=False,
            indices=False, lang=language,
        )
    except UapiError as exc:
        return {"error": f"API error: {exc}"}


# ── 资源清理 ──────────────────────────────────────────────────────────

async def close_http_client():
    """应用关闭时调用，关闭 HTTP 客户端连接。"""
    global _http
    if _http and not _http.is_closed:
        await _http.aclose()
        _http = None
