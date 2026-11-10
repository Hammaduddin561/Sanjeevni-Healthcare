import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.orm import Session
from backend.database import Base
from backend.utils.logger import audit_logger, sanitize_data


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    actor_email = Column(String, index=True, nullable=False)
    actor_role = Column(String, index=True, nullable=False)
    action = Column(String, index=True, nullable=False)
    resource = Column(String, nullable=False)
    outcome = Column(String, default="success", nullable=False)
    details = Column(Text, nullable=True)  # Sanitized JSON string (zero patient PII)


def record_audit_event(
    db: Session,
    actor_email: str,
    actor_role: str,
    action: str,
    resource: str,
    outcome: str = "success",
    details: Optional[Dict[str, Any]] = None
) -> None:
    """
    Persists a zero-PII audit event to SQLite and emits structured audit log.
    Patient names, IDs, emails in patient fields are stripped/redacted.
    """
    safe_details = sanitize_data(details or {})
    # Never log patient identifiers
    for pii_key in ["patient_id", "patient_name", "name", "email", "phone", "address"]:
        if isinstance(safe_details, dict) and pii_key in safe_details:
            safe_details.pop(pii_key, None)

    try:
        ev = AuditEvent(
            timestamp=datetime.now(timezone.utc),
            actor_email=actor_email,
            actor_role=actor_role,
            action=action,
            resource=resource,
            outcome=outcome,
            details=json.dumps(safe_details)
        )
        db.add(ev)
        db.commit()
    except Exception as e:
        db.rollback()
        audit_logger.warning("Failed persisting AuditEvent: %s", e)

    audit_logger.info(
        "%s on %s (%s)",
        action,
        resource,
        outcome,
        extra={"audit_event": {"action": action, "role": actor_role, "resource": resource, "outcome": outcome, "details": safe_details}}
    )
