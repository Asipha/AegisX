from fastapi import APIRouter, Depends, Response
from database import SessionLocal
from models import Alert, Event, LogFile, AuditLog
from auth_utils import get_current_user
import csv
import io

router = APIRouter()

@router.get("/api/reports/export")
def export_csv(user: dict = Depends(get_current_user)):
    db = SessionLocal()
    alerts = db.query(Alert).all()
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Alert ID", "Title", "Severity", "Source IP", "Status", "Rule", "First Seen"])
    
    for a in alerts:
        writer.writerow([a.id, a.title, a.severity, a.source_ip, a.status, a.rule_name, a.first_seen])
    
    db.close()
    output.seek(0)
    
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sentinelx_alerts.csv"}
    )

@router.get("/api/audit")
def get_audit_logs(user: dict = Depends(get_current_user)):
    db = SessionLocal()
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()
    result = [{"id": l.id, "time": l.timestamp.isoformat(), "user": l.username, "action": l.action, "details": l.details} for l in logs]
    db.close()
    return result

@router.post("/api/audit")
def add_audit_log(payload: dict, user: dict = Depends(get_current_user)):
    db = SessionLocal()
    log = AuditLog(username=user["username"], action=payload.get("action"), details=payload.get("details"))
    db.add(log)
    db.commit()
    db.close()
    return {"status": "logged"}
