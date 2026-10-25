from models import DetectionRule
import re

def evaluate_custom_rules(db, new_events):
    alerts = []
    rules = db.query(DetectionRule).filter(DetectionRule.enabled == True).all()

    for rule in rules:
        matched_events = []
        for event in new_events:
            rule_type = (rule.event_type or "").strip().lower()
            if rule_type and rule_type != "any":
                if (event.event_type or "").lower() != rule_type:
                    continue

            field_name = rule.field or "message"
            field_val = getattr(event, field_name, None)
            if field_val is None and field_name == "raw_line":
                field_val = event.message
            if field_val is None:
                continue

            field_str = str(field_val).lower()
            value_str = str(rule.value or "").lower()
            match = False

            op = (rule.operator or "").lower()
            if op == "contains":
                match = value_str in field_str
            elif op == "equals":
                match = field_str == value_str
            elif op == "regex":
                try:
                    match = bool(re.search(value_str, field_str, re.IGNORECASE))
                except re.error:
                    continue

            if match:
                matched_events.append(event)

        if matched_events:
            matched_events.sort(key=lambda x: x.timestamp)
            alerts.append({
                "title": f"Rule Triggered: {rule.name}",
                "description": f"Matched {len(matched_events)} event(s) where {rule.field} {rule.operator} '{rule.value}'",
                "severity": rule.severity or "medium",
                "source_ip": matched_events[0].source_ip,
                "rule_name": rule.name,
                "confidence": "high",
                "first_seen": matched_events[0].timestamp,
                "last_seen": matched_events[-1].timestamp,
            })
    return alerts
