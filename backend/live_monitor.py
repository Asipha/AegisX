import time
import requests
import subprocess
import sys

print("[*] Logging in to AegisX...")
session = requests.Session()
# Change 'Admin@123' if you changed your demo password
login_res = session.post("http://127.0.0.1:8000/auth/login", json={"username": "demo", "password": "Admin@123"})

if login_res.status_code != 200:
    print("[!] Login failed. Check your demo password.")
    sys.exit(1)

print("[*] Successfully authenticated.")
print("[*] Watching /var/log/auth.log for new events...")
print("[*] Leave this terminal running. Open a new terminal and try to SSH into the machine.")

try:
    # tail -F follows the file even if it rotates
    process = subprocess.Popen(['sudo', 'tail', '-F', '/var/log/auth.log'], stdout=subprocess.PIPE, text=True)
    
    for line in process.stdout:
        if line.strip():
            res = session.post("http://127.0.0.1:8000/api/logs/live", json={"line": line})
            if res.status_code == 200:
                print(f"✅ Sent to AegisX: {line.strip()[:60]}...")
                
except KeyboardInterrupt:
    print("\n[*] Stopping Monitor.")
    process.terminate()
