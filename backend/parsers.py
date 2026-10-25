import re
from datetime import datetime

def parse_generic_line(line: str):
    line = line.strip()
    if not line:
        return None

    ip_match = re.search(r'\b(\d{1,3}(?:\.\d{1,3}){3})\b', line)

    parsed_time = None
    iso_match = re.search(r'(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})', line)
    
    if iso_match:
        parsed_time = datetime.fromisoformat(iso_match.group(1).replace('T', ' '))
    else:
        syslog_match = re.search(r'([A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})', line)
        if syslog_match:
            try:
                current_year = datetime.now().year
                dt_str = f"{current_year} {syslog_match.group(1)}"
                parsed_time = datetime.strptime(dt_str, "%Y %b %d %H:%M:%S")
            except ValueError:
                pass

    if not parsed_time:
        parsed_time = datetime.utcnow()

    event_type = "unknown"
    lower = line.lower()

    # --- UPGRADED LOGIC FOR KALI AUTH LOGS ---
    if "failed password" in lower or "authentication failure" in lower or "invalid user" in lower:
        event_type = "login_failed"
    elif "accepted password" in lower or "session opened for user" in lower:
        event_type = "login_success"
    elif "sudo:" in lower:
        event_type = "sudo_execution"
    elif "error" in lower or "timeout" in lower:
        event_type = "error"

    return {
        "timestamp": parsed_time.isoformat(),
        "source_ip": ip_match.group(1) if ip_match else None,
        "event_type": event_type,
        "message": line[:500] or "(empty line)",
        "raw_line": line or "(empty line)",
    }

def parse_file(path: str):
    events = []
    with open(path, "r", errors="replace") as f:
        for line in f:
            event = parse_generic_line(line)
            if event:
                events.append(event)
    return events
