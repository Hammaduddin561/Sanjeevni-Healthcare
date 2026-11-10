import logging
import os
import json
import re
from datetime import datetime, timezone
from typing import Any, Dict

SENSITIVE_KEYS = {
    "patient_name", "name", "email", "phone", "address", 
    "password", "hashed_password", "token", "access_token",
    "clinician_name", "google_id"
}

def sanitize_data(data: Any) -> Any:
    """Recursively sanitize sensitive identifiers from dicts and lists."""
    if isinstance(data, dict):
        sanitized = {}
        for k, v in data.items():
            if k.lower() in SENSITIVE_KEYS:
                sanitized[k] = "[REDACTED]"
            elif isinstance(v, (dict, list)):
                sanitized[k] = sanitize_data(v)
            else:
                sanitized[k] = v
        return sanitized
    elif isinstance(data, list):
        return [sanitize_data(item) for item in data]
    return data

class StructuredLogFormatter(logging.Formatter):
    """Formats logs as JSON without patient identifying information."""
    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage()
        }
        if hasattr(record, "audit_event"):
            log_obj["audit"] = sanitize_data(record.audit_event)
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_obj)

def get_logger(name: str = "sanjeevni") -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        log_level = os.getenv("LOG_LEVEL", "INFO").upper()
        logger.setLevel(getattr(logging, log_level, logging.INFO))
        handler = logging.StreamHandler()
        handler.setFormatter(StructuredLogFormatter())
        logger.addHandler(handler)
        logger.propagate = False
    return logger

# Primary app logger
app_logger = get_logger("sanjeevni.app")
audit_logger = get_logger("sanjeevni.audit")
