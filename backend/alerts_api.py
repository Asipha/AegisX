from fastapi import APIRouter, Depends, HTTPException
from database import SessionLocal
from models import Alert
from auth_utils import get_current_user
from pydantic import BaseModel

router = APIRouter()

class AlertUpdate(BaseModel):
    status: str = None
    notes: str = None
    assignee: str = None

@router.patch("/api/alerts/{alert_id}")
def update_alert(alert_id: int, payload: AlertUpdate, user: dict = Depends(get_current_user)):
    valid = {"new", "in_progress", "escalated", "resolved", "false_positive"}
    db = SessionLocal()
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(404, "Alert not found")
    
    if payload.status:
        if payload.status not in valid:
            raise HTTPException(400, "Invalid status")
        alert.status = payload.status
        
    if payload.notes is not None:
        alert.notes = payload.notes
        
    if payload.assignee is not None:
        alert.assignee = payload.assignee

    db.commit()
    db.close()
    return {"ok": True}
