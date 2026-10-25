from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class LogFile(Base):
    __tablename__ = "log_files"
    id = Column(Integer, primary_key=True)
    filename = Column(String(255), nullable=False)
    stored_path = Column(String(500), nullable=False)
    file_size = Column(Integer, default=0)
    upload_time = Column(DateTime, default=datetime.utcnow)
    status = Column(String(20), default="pending")
    event_count = Column(Integer, default=0)
    uploaded_by = Column(Integer, ForeignKey("users.id"))

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True)
    log_file_id = Column(Integer, ForeignKey("log_files.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    source_ip = Column(String(45))
    dest_ip = Column(String(45))
    event_type = Column(String(50))
    severity = Column(String(20), default="info")
    message = Column(Text)
    raw_line = Column(Text)
    is_simulated = Column(Boolean, default=False)

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True)
    title = Column(String(200))
    description = Column(Text)
    severity = Column(String(20))
    source_ip = Column(String(45))
    status = Column(String(20), default="new")
    rule_name = Column(String(100))
    notes = Column(Text, default='')
    triaged_by = Column(String(50))
    confidence = Column(String(20), default="medium")
    notes = Column(Text, default="")
    assignee = Column(String(50), default="")
    first_seen = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)

class FirewallAction(Base):
    __tablename__ = "firewall_actions"
    id = Column(Integer, primary_key=True)
    ip_address = Column(String(45), nullable=False)
    action = Column(String(20))
    reason = Column(Text)
    analyst = Column(String(50))
    success = Column(Boolean, default=False)
    command_output = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

class DetectionRule(Base):
    __tablename__ = "detection_rules"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    event_type = Column(String(50))
    field = Column(String(50))
    operator = Column(String(20))
    value = Column(String(200))
    severity = Column(String(20))
    enabled = Column(Boolean, default=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    username = Column(String(50))
    action = Column(String(200))
    details = Column(Text)
