import os, uuid, bcrypt, ipaddress, subprocess, re, threading
from datetime import datetime, timedelta
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from itsdangerous import URLSafeSerializer, BadSignature
from database import SessionLocal, init_db
from models import User, LogFile, Event, Alert, FirewallAction, AuditLog
from parsers import parse_file, parse_generic_line
from detections import evaluate_custom_rules
from auth_utils import get_current_user, serializer
from rules_api import router as rules_router
from reports_api import router as reports_router
import psutil

app = FastAPI(title="AegisX SOC API")

app.include_router(rules_router)
app.include_router(reports_router)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://.*:5173",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
MAX_SIZE = 10 * 1024 * 1024

@app.on_event("startup")
def startup():
    init_db()

# ---------- AUTH ----------
@app.post("/auth/login")
def login(payload: dict, response: Response):
    username = payload.get("username", "")
    password = payload.get("password", "")
    db = SessionLocal()
    user = db.query(User).filter(User.username == username).first()
    db.close()
    if not user or not bcrypt.checkpw(password.encode(), user.password_hash.encode()):
        raise HTTPException(401, "Invalid credentials")
    token = serializer.dumps({"id": user.id, "username": user.username})
    response.set_cookie("session", token, httponly=True, samesite="lax", max_age=3600)
    return {"username": user.username}

@app.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie("session")
    return {"ok": True}

@app.get("/api/me")
def me(user: dict = Depends(get_current_user)):
    return user

# ---------- SYSTEM HEALTH ----------
@app.get("/api/system/health")
def system_health(user: dict = Depends(get_current_user)):
    cpu = psutil.cpu_percent(interval=None)
    ram = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    return {
        "cpu_percent": cpu,
        "ram_percent": ram.percent,
        "ram_used_gb": round(ram.used / (1024**3), 2),
        "ram_total_gb": round(ram.total / (1024**3), 2),
        "disk_percent": disk.percent,
        "disk_used_gb": round(disk.used / (1024**3), 2),
        "disk_total_gb": round(disk.total / (1024**3), 2),
        "status": "healthy" if cpu < 80 and ram.percent < 80 else "degraded"
    }

# ---------- DASHBOARD ----------
@app.get("/api/stats")
def stats(user: dict = Depends(get_current_user)):
    db = SessionLocal()
    total = db.query(Event).filter(Event.is_simulated == False).count()
    alerts = db.query(Alert).all()
    critical = sum(1 for a in alerts if a.severity == "critical")
    high = sum(1 for a in alerts if a.severity == "high")
    medium = sum(1 for a in alerts if a.severity == "medium")
    low = sum(1 for a in alerts if a.severity == "low")
    active = sum(1 for a in alerts if a.status in ("new", "in_progress", "escalated"))
    files = db.query(LogFile).count()
    db.close()
    return {"total_events": total, "critical": critical, "high": high, "medium": medium, "low": low,
            "active_incidents": active, "log_files": files}

# ---------- LOGS ----------
@app.post("/api/logs/upload")
async def upload_log(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".log", ".txt", ".json", ".csv"):
        raise HTTPException(400, "Unsupported file type")
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(400, "File exceeds 10MB")
    if len(content) == 0:
        raise HTTPException(400, "Empty file")

    safe_name = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR, safe_name)
    with open(path, "wb") as f:
        f.write(content)

    db = SessionLocal()
    record = LogFile(filename=file.filename, stored_path=path, file_size=len(content), status="processing", uploaded_by=user["id"])
    db.add(record)
    db.commit()
    db.refresh(record)

    try:
        events = parse_file(path)
        for e in events:
            try: ts = datetime.fromisoformat(e["timestamp"])
            except: ts = datetime.utcnow()
            db.add(Event(log_file_id=record.id, timestamp=ts, source_ip=e.get("source_ip"), event_type=e.get("event_type"), message=e.get("message"), raw_line=e.get("raw_line"), is_simulated=False))
        record.status = "complete"
        record.event_count = len(events)
        db.commit()

        new_events = db.query(Event).filter(Event.log_file_id == record.id).all()
        for alert_data in evaluate_custom_rules(db, new_events):
            db.add(Alert(**alert_data))
        db.commit()
    except Exception as e:
        record.status = "error"
        db.commit()
    finally:
        db.close()

    return {"id": record.id, "filename": record.filename, "size": record.file_size, "events": record.event_count}

@app.get("/api/logs")
def list_logs(user: dict = Depends(get_current_user)):
    db = SessionLocal()
    files = db.query(LogFile).order_by(LogFile.upload_time.desc()).all()
    result = [{"id": f.id, "filename": f.filename, "size": f.file_size, "status": f.status, "event_count": f.event_count, "uploaded": f.upload_time.isoformat()} for f in files]
    db.close()
    return result

@app.get("/api/logs/{log_id}/events")
def get_log_events(log_id: int, limit: int = 200, user: dict = Depends(get_current_user)):
    db = SessionLocal()
    events = db.query(Event).filter(Event.log_file_id == log_id).order_by(Event.timestamp.desc()).limit(limit).all()
    result = [{"id": e.id, "timestamp": e.timestamp.isoformat(), "source_ip": e.source_ip, "event_type": e.event_type, "raw_line": e.raw_line} for e in events]
    db.close()
    return result

@app.delete("/api/logs/{log_id}")
def delete_log(log_id: int, user: dict = Depends(get_current_user)):
    db = SessionLocal()
    log = db.query(LogFile).filter(LogFile.id == log_id).first()
    if not log:
        db.close()
        raise HTTPException(404, "Log file not found")
    db.query(Event).filter(Event.log_file_id == log_id).delete()
    if os.path.exists(log.stored_path):
        os.remove(log.stored_path)
    db.delete(log)
    db.commit()
    db.close()
    return {"status": "deleted"}

# ---------- LIVE MONITOR ----------
live_process = None

def background_live_monitor(file_id):
    global live_process
    try:
        live_process = subprocess.Popen(["sudo", "tail", "-n", "0", "-F", "/var/log/auth.log"], stdout=subprocess.PIPE, text=True)
        for line in iter(live_process.stdout.readline, ''):
            if not line.strip(): continue
            db = SessionLocal()
            e = parse_generic_line(line)
            if e:
                try: ts = datetime.fromisoformat(e["timestamp"])
                except: ts = datetime.utcnow()
                event = Event(log_file_id=file_id, timestamp=ts, source_ip=e.get("source_ip"), event_type=e.get("event_type"), message=e.get("message"), raw_line=e.get("raw_line"), is_simulated=False)
                db.add(event)
                f = db.query(LogFile).filter(LogFile.id == file_id).first()
                if f: f.event_count += 1
                db.commit()
                db.refresh(event)
                for alert_data in evaluate_custom_rules(db, [event]):
                    db.add(Alert(**alert_data))
                db.commit()
            db.close()
    except Exception as e:
        print(f"Live monitor crashed: {e}")

@app.post("/api/logs/live/start")
def start_live_monitor(user: dict = Depends(get_current_user)):
    global live_process
    test_res = subprocess.run(["sudo", "tail", "-n", "1", "/var/log/auth.log"], capture_output=True, text=True)
    if test_res.returncode != 0:
        raise HTTPException(500, f"Permission denied. Error: {test_res.stderr}")
    if live_process and live_process.poll() is None:
        return {"status": "already_running"}
    db = SessionLocal()
    live_file = db.query(LogFile).filter(LogFile.filename == "Live_Kali_Stream.log").first()
    if not live_file:
        live_file = LogFile(filename="Live_Kali_Stream.log", stored_path="live", file_size=0, status="live", uploaded_by=user["id"])
        db.add(live_file)
        db.commit()
        db.refresh(live_file)
    file_id = live_file.id
    db.close()
    thread = threading.Thread(target=background_live_monitor, args=(file_id,), daemon=True)
    thread.start()
    return {"status": "started", "file_id": file_id}

@app.post("/api/logs/live/stop")
def stop_live_monitor(user: dict = Depends(get_current_user)):
    global live_process
    if live_process and live_process.poll() is None:
        subprocess.run(["sudo", "kill", str(live_process.pid)])
        live_process = None
        return {"status": "stopped"}
    return {"status": "not_running"}

# ---------- ALERTS ----------
@app.get("/api/alerts")
def list_alerts(user: dict = Depends(get_current_user)):
    db = SessionLocal()
    alerts = db.query(Alert).order_by(Alert.id.desc()).all()
    result = [{"id": a.id, "title": a.title, "description": a.description, "severity": a.severity, "source_ip": a.source_ip, "status": a.status, "rule": a.rule_name, "confidence": a.confidence, "first_seen": a.first_seen.isoformat(), "last_seen": a.last_seen.isoformat(), "notes": a.notes or "", "triaged_by": a.triaged_by or ""} for a in alerts]
    db.close()
    return result

@app.get("/api/alerts/{alert_id}/events")
def get_alert_events(alert_id: int, user: dict = Depends(get_current_user)):
    db = SessionLocal()
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        db.close()
        raise HTTPException(404, "Alert not found")
    start_time = alert.first_seen - timedelta(seconds=5)
    end_time = alert.last_seen + timedelta(seconds=5)
    if alert.rule_name == "builtin_brute_force":
        events = db.query(Event).filter(Event.source_ip == alert.source_ip, Event.event_type == "login_failed", Event.timestamp >= start_time, Event.timestamp <= end_time).order_by(Event.timestamp.desc()).limit(20).all()
    elif alert.rule_name.startswith("builtin_"):
        events = db.query(Event).filter(Event.source_ip == alert.source_ip, Event.timestamp >= start_time, Event.timestamp <= end_time).order_by(Event.timestamp.desc()).limit(20).all()
    else:
        events = db.query(Event).filter(Event.timestamp >= start_time, Event.timestamp <= end_time).order_by(Event.timestamp.desc()).limit(20).all()

    result = [{"id": e.id, "timestamp": e.timestamp.isoformat(), "source_ip": e.source_ip, "event_type": e.event_type, "raw_line": e.raw_line} for e in events]
    db.close()
    return result

@app.patch("/api/alerts/{alert_id}")
def update_alert(alert_id: int, payload: dict, user: dict = Depends(get_current_user)):
    db = SessionLocal()
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        db.close()
        raise HTTPException(404, "Alert not found")
    if "status" in payload:
        valid_statuses = ["new", "in_progress", "escalated", "resolved", "false_positive", "true_positive"]
        if payload["status"] not in valid_statuses:
            db.close()
            raise HTTPException(400, f"Invalid status: {payload['status']}")
        alert.status = payload["status"]
        if payload["status"] in ["true_positive", "false_positive", "resolved"]:
            alert.triaged_by = user["username"]
    if "notes" in payload:
        alert.notes = payload["notes"]
    db.commit()
    db.close()
    return {"ok": True}

@app.delete("/api/alerts/all")
def clear_all_alerts(user: dict = Depends(get_current_user)):
    db = SessionLocal()
    try:
        active_statuses = ["new", "in_progress", "escalated"]
        deleted = db.query(Alert).filter(Alert.status.in_(active_statuses)).delete(synchronize_session=False)
        db.commit()
        return {"status": "success", "deleted": deleted}
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))
    finally:
        db.close()

# ---------- FIREWALL ----------
@app.get("/api/firewall/actions")
def firewall_actions(user: dict = Depends(get_current_user)):
    db = SessionLocal()
    actions = db.query(FirewallAction).order_by(FirewallAction.timestamp.desc()).limit(100).all()
    result = [{"id": a.id, "ip": a.ip_address, "action": a.action, "reason": a.reason, "analyst": a.analyst, "success": a.success, "output": a.command_output, "timestamp": a.timestamp.isoformat()} for a in actions]
    db.close()
    return result

@app.post("/api/firewall/block")
def block_ip(payload: dict, user: dict = Depends(get_current_user)):
    ip = payload.get("ip", "")
    reason = payload.get("reason", "")
    try:
        ipaddress.ip_address(ip)
    except ValueError:
        raise HTTPException(400, "Invalid IP address")
    result = subprocess.run(["sudo", "/usr/local/bin/sentinelx-ufw", "block", ip], capture_output=True, text=True)
    db = SessionLocal()
    db.add(FirewallAction(ip_address=ip, action="block", reason=reason, analyst=user["username"], success=(result.returncode == 0), command_output=result.stdout + result.stderr))
    db.commit()
    db.close()
    if result.returncode != 0:
        raise HTTPException(500, f"Firewall rejected: {result.stdout}{result.stderr}")
    return {"success": True, "output": result.stdout}

@app.delete("/api/firewall/unblock/{ip}")
def unblock_ip(ip: str, user: dict = Depends(get_current_user)):
    try:
        ipaddress.ip_address(ip)
    except ValueError:
        raise HTTPException(400, "Invalid IP address")
    result = subprocess.run(["sudo", "/usr/local/bin/sentinelx-ufw", "unblock", ip], capture_output=True, text=True)
    db = SessionLocal()
    db.add(FirewallAction(ip_address=ip, action="unblock", reason="Removed via UI", analyst=user["username"], success=(result.returncode == 0), command_output=result.stdout + result.stderr))
    db.commit()
    db.close()
    if result.returncode != 0:
        raise HTTPException(500, f"Firewall rejected: {result.stdout}{result.stderr}")
    return {"success": True, "output": result.stdout}

@app.get("/api/health")
def health():
    return {"status": "ok"}
