import logging
import sys
from pathlib import Path

from loguru import logger

from common.config.constants import LOG_DIR, LOG_FORMAT, LOG_ROTATION, LOG_RETENTION, LOG_COMPRESSION


class InterceptHandler(logging.Handler):
    """拦截标准 logging 日志，转发到 Loguru"""

    def emit(self, record: logging.LogRecord) -> None:
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        frame, depth = logging.currentframe(), 2
        while frame and frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(level, record.getMessage())


def _configure_standard_logging() -> None:
    """统一接管标准 logging 和常见第三方库日志。"""
    intercept_handler = InterceptHandler()
    logging.basicConfig(handlers=[intercept_handler], level=0, force=True)

    third_party_loggers = {
        "uvicorn": logging.WARNING,
        "uvicorn.error": logging.WARNING,
        "uvicorn.access": logging.WARNING,
        "sqlalchemy": logging.WARNING,
        "fastapi": logging.WARNING,
    }

    for name, level in third_party_loggers.items():
        log = logging.getLogger(name)
        log.handlers = [intercept_handler]
        log.propagate = False
        log.setLevel(level)


# def is_logger_configured() -> bool:
#     """返回当前进程是否已经完成日志初始化。"""
#     return _LOGGER_CONFIGURED


def setup_logger(
        console_level: str = "INFO",
        file_level: str = "INFO",
        enable_file_log: bool = True,
        force: bool = False,
):
    """
    配置日志系统

    Args:
        console_level: 控制台日志级别
        file_level: 文件日志级别
        enable_file_log: 是否启用文件日志

    Returns:
        配置好的 logger 实例
    """


    # 移除默认处理器
    logger.remove()

    # 控制台输出。PyInstaller windowed 模式下 sys.stderr 可能为 None。
    if sys.stderr is not None:
        logger.add(
            sys.stderr,
            format=LOG_FORMAT,
            level=console_level,
            colorize=True,
            backtrace=True,
            diagnose=True,
            enqueue=True,  # 异步写入
        )

    # 文件输出
    if enable_file_log:
        log_dir = Path(LOG_DIR)
        log_dir.mkdir(parents=True, exist_ok=True)

        # 普通日志文件
        logger.add(
            log_dir / "app_{time:YYYY-MM-DD}.log",
            format=LOG_FORMAT,
            level=file_level,
            rotation=LOG_ROTATION,
            retention=LOG_RETENTION,
            compression=LOG_COMPRESSION,
            encoding="utf-8",
            backtrace=True,
            enqueue=True,
        )

        # 错误日志单独文件
        logger.add(
            log_dir / "error_{time:YYYY-MM-DD}.log",
            format=LOG_FORMAT,
            level="ERROR",
            rotation="100 MB",
            retention=LOG_RETENTION,
            compression=LOG_COMPRESSION,
            encoding="utf-8",
            backtrace=True,
            diagnose=True,
            enqueue=True,
        )

    _configure_standard_logging()
    # _LOGGER_CONFIGURED = True

    logger.info("日志系统初始化完成 | 日志目录: {}", LOG_DIR)
    return logger


# 自动初始化（可选）
# setup_logger()


if __name__ == "__main__":
    print(f"日志目录: {LOG_DIR}")

    # 测试日志
    log = setup_logger()
    logger.debug("调试信息")
    logger.info("普通信息")
    logger.warning("警告信息")
    logger.error("错误信息")
