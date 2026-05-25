# -*- mode: python ; coding: utf-8 -*-

from PyInstaller.utils.hooks import collect_submodules


hiddenimports = []
for package in (
    "aiosqlite",
    "langchain",
    "langchain_core",
    "langchain_deepseek",
    "langchain_mcp_adapters",
    "langchain_tavily",
    "langgraph",
    "langgraph_checkpoint_sqlite",
    "mcp",
    "sqlalchemy",
    "uvicorn",
):
    if package == "mcp":
        hiddenimports += collect_submodules(
            package,
            filter=lambda name: not name.startswith("mcp.cli"),
        )
    else:
        hiddenimports += collect_submodules(package)


a = Analysis(
    ["src/backend_main.py"],
    pathex=["src"],
    binaries=[],
    datas=[("src/resources", "resources")],
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="NaviStarBackend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
