import asyncio
import json
import sys
import threading
from datetime import datetime, timezone
from scapy.all import sniff, IP, TCP, UDP, ICMP, ARP
import websockets

packet_buffer = []
connected_clients = set()
main_loop = None

def handle_packet(pkt):
    rec = None
    
    # 1. Handle IP packets (TCP, UDP, ICMP, etc.)
    if IP in pkt:
        proto_name = "Unknown"
        if TCP in pkt:
            proto_name = "TCP"
        elif UDP in pkt:
            proto_name = "UDP"
        elif ICMP in pkt:
            proto_name = "ICMP"
        else:
            # Map other common IP protocols
            proto_map = {2: "IGMP", 47: "GRE", 50: "ESP", 51: "AH", 58: "ICMPv6"}
            proto_name = proto_map.get(pkt[IP].proto, f"IP-{pkt[IP].proto}")
            
        rec = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "src_ip": pkt[IP].src,
            "dst_ip": pkt[IP].dst,
            "src_port": pkt[TCP].sport if TCP in pkt else pkt[UDP].sport if UDP in pkt else 0,
            "dst_port": pkt[TCP].dport if TCP in pkt else pkt[UDP].dport if UDP in pkt else 0,
            "protocol": proto_name,
            "length": len(pkt)
        }
    
    # 2. Handle ARP packets (which have no IP layer)
    elif ARP in pkt:
        rec = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "src_ip": pkt[ARP].psrc,
            "dst_ip": pkt[ARP].pdst,
            "src_port": 0,
            "dst_port": 0,
            "protocol": "ARP",
            "length": len(pkt)
        }

    # 3. If it's a valid packet we recognized, broadcast it
    if rec:
        packet_buffer.append(rec)
        if len(packet_buffer) > 100:
            packet_buffer.pop(0)
            
        if connected_clients and main_loop:
            msg = json.dumps({"type": "packet", "data": rec})
            for ws in list(connected_clients):
                asyncio.run_coroutine_threadsafe(ws.send(msg), main_loop)

async def ws_handler(websocket):
    connected_clients.add(websocket)
    try:
        for pkt in packet_buffer:
            await websocket.send(json.dumps({"type": "packet", "data": pkt}))
        await websocket.wait_closed()
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        connected_clients.remove(websocket)

def start_ws_server():
    global main_loop
    main_loop = asyncio.new_event_loop()
    asyncio.set_event_loop(main_loop)
    
    async def run_server():
        async with websockets.serve(ws_handler, "0.0.0.0", 8765):
            await asyncio.Future()
            
    main_loop.run_until_complete(run_server())

if __name__ == "__main__":
    iface = sys.argv[1] if len(sys.argv) > 1 else "eth0"
    
    print(f"[*] Starting packet capture on {iface}...")
    
    ws_thread = threading.Thread(target=start_ws_server, daemon=True)
    ws_thread.start()
    
    try:
        # Capture ALL packets (no filter applied)
        sniff(iface=iface, prn=handle_packet, store=False)
    except PermissionError:
        print("[!] ERROR: Root privileges required.")
    except KeyboardInterrupt:
        print("\n[*] Stopping capture.")
