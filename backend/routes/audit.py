import json
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.database import get_db, Base, engine
from backend.models.audit import AuditEvent
from backend.models.user import User
from backend.auth import require_admin

Base.metadata.create_all(bind=engine)

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("")
@router.get("/")
def get_audit_logs(
    limit: int = Query(100, ge=1, le=500),
    action: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin-only real audit log endpoint backed by persistent SQLite audit_events."""
    query = db.query(AuditEvent)
    if action:
        query = query.filter(AuditEvent.action == action.upper())
    rows = query.order_by(desc(AuditEvent.timestamp)).limit(limit).all()

    events = []
    for row in rows:
        try:
            details = json.loads(row.details) if row.details else {}
        except Exception:
            details = {}
        events.append({
            "id": row.id,
            "timestamp": row.timestamp.isoformat(),
            "actor_email": row.actor_email,
            "actor_role": row.actor_role,
            "action": row.action,
            "resource": row.resource,
            "outcome": row.outcome,
            "details": details,
        })

    return {
        "events": events,
        "total": len(events),
        "requested_by": current_user.email,
    }
