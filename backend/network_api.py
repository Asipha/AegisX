from fastapi import APIRouter, Depends
import subprocess
from auth_utils import get_current_user

router = APIRouter()
capture_process = None

@router.post("/api/network/start")
def start_capture(user: dict = Depends(get_current_user)):
    global capture_process
    if capture_process and capture_process.poll() is None:
        return {"status": "already_running"}
    
    # Launch the scapy script with sudo
    capture_process = subprocess.Popen(
        ["sudo", "/home/kali/sentinelx/backend/venv/bin/python", "/home/kali/sentinelx/backend/packet_capture.py", "eth0"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    return {"status": "started"}

@router.post("/api/network/stop")
def stop_capture(user: dict = Depends(get_current_user)):
    global capture_process
    if capture_process and capture_process.poll() is None:
        subprocess.run(["sudo", "kill", str(capture_process.pid)])
        capture_process = None
        return {"status": "stopped"}
    return {"status": "not_running"}
