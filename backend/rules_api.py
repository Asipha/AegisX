from fastapi import APIRouter, Depends, HTTPException
from database import SessionLocal
from models import DetectionRule
from auth_utils import get_current_user

router = APIRouter()

@router.get("/api/rules")
def list_rules(user: dict = Depends(get_current_user)):
    db = SessionLocal()
    rules = db.query(DetectionRule).all()
    result = [{"id": r.id, "name": r.name, "event_type": r.event_type,
               "field": r.field, "operator": r.operator, "value": r.value,
               "severity": r.severity, "enabled": r.enabled} for r in rules]
    db.close()
    return result

@router.post("/api/rules")
def create_rule(payload: dict, user: dict = Depends(get_current_user)):
    db = SessionLocal()
    rule = DetectionRule(
        name=payload.get("name"),
        event_type=payload.get("event_type"),
        field=payload.get("field"),
        operator=payload.get("operator"),
        value=payload.get("value"),
        severity=payload.get("severity"),
        enabled=True
    )
    db.add(rule)
    db.commit()
    db.close()
    return {"status": "created"}

@router.delete("/api/rules/{rule_id}")
def delete_rule(rule_id: int, user: dict = Depends(get_current_user)):
    db = SessionLocal()
    rule = db.query(DetectionRule).filter(DetectionRule.id == rule_id).first()
    if rule:
        db.delete(rule)
        db.commit()
    db.close()
    return {"status": "deleted"}

@router.patch("/api/rules/{rule_id}/toggle")
def toggle_rule(rule_id: int, user: dict = Depends(get_current_user)):
    db = SessionLocal()
    rule = db.query(DetectionRule).filter(DetectionRule.id == rule_id).first()
    if rule:
        rule.enabled = not rule.enabled
        db.commit()
    db.close()
    return {"status": "toggled"}

@router.put("/api/rules/{rule_id}")
def update_rule(rule_id: int, payload: dict, user: dict = Depends(get_current_user)):
    db = SessionLocal()
    rule = db.query(DetectionRule).filter(DetectionRule.id == rule_id).first()
    if not rule:
        db.close()
        raise HTTPException(404, "Rule not found")
        
    rule.name = payload.get("name", rule.name)
    rule.event_type = payload.get("event_type", rule.event_type)
    rule.field = payload.get("field", rule.field)
    rule.operator = payload.get("operator", rule.operator)
    rule.value = payload.get("value", rule.value)
    rule.severity = payload.get("severity", rule.severity)
    
    db.commit()
    db.close()
    return {"status": "updated"}
