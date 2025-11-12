import logging
import logging.config
import os


def setup_logging():
    LOGGING_CONFIG = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "verbose": {
                "format": "{asctime} {levelname} {name}[{lineno:d}] {process:d} {thread:d}: {message}",
                "style": "{",
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "verbose",
            },
        },
        "root": {
            "handlers": ["console"],
            "level": os.getenv("APP_LOG_LEVEL", "INFO"),
            'formatter': 'verbose'
        },
        "loggers": {
            "django": {
                "handlers": ["console"],
                "level": os.getenv("APP_LOG_LEVEL", "INFO"),
                "propagate": False,
                "formatter": "verbose"
            },
        },
    }
    logging.config.dictConfig(LOGGING_CONFIG)
