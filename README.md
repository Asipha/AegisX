# SentinelX SOC Dashboard

## How to Start the App
You need three terminals open.

### Terminal 1: Backend
cd ~/sentinelx/backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

### Terminal 2: Frontend
cd ~/sentinelx/frontend
npm run dev

### Terminal 3: Network Capture (Optional)
cd ~/sentinelx/backend
sudo ./venv/bin/python packet_capture.py eth0

## Access from Host Machine
Go to: http://<YOUR-KALI-IP>:5173
Default Login: demo / SentinelX2024!
