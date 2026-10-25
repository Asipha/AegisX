import { useEffect, useState } from "react";
import { getFirewallActions, blockIP, unblockIP } from "../api";
import api from "../api";

export default function Firewall() {
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");
  const [actions, setActions] = useState([]);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);

  const refresh = () => {
    getFirewallActions().then((r) => setActions(r.data));
  };
  
  useEffect(() => { 
    refresh(); 
  }, []);

  const handleBlock = async () => {
    if (!ip) { 
      setMsg({ text: "Enter an IP address", type: "error" }); 
      return; 
    }
    if (!confirm("Block " + ip + " via UFW?")) return;
    
    setLoading(true);
    setMsg({ text: "Executing firewall command...", type: "info" });
    
    try {
      const res = await blockIP(ip, reason);
      setMsg({ text: "Blocked: " + (res.data.output || "success"), type: "success" });
      setIp(""); 
      setReason("");
      
      await api.post("/api/audit", { action: "Firewall Block", details: "Blocked IP " + ip + " - " + reason });
      await refresh(); 
    } catch (err) {
      setMsg({ text: "Error: " + (err.response?.data?.detail || err.message), type: "error" });
      await refresh(); 
    }
    setLoading(false);
  };

  const handleUnblock = async (targetIp) => {
    if (!confirm("Remove block for " + targetIp + "?")) return;
    
    setLoading(true);
    setMsg({ text: "Removing firewall rule...", type: "info" });
    
    try {
      const res = await unblockIP(targetIp);
      setMsg({ text: "Unblocked: " + (res.data.output || "success"), type: "success" });
      
      await api.post("/api/audit", { action: "Firewall Unblock", details: "Unblocked IP " + targetIp });
      await refresh(); 
    } catch (err) {
      setMsg({ text: "Error: " + (err.response?.data?.detail || err.message), type: "error" });
      await refresh();
    }
    setLoading(false);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-sentinel-cyan">Firewall Management</h1>
      </div>

      <div className="p-6 rounded-lg border border-sentinel-border bg-sentinel-card mb-6">
        <h2 className="text-lg font-bold mb-4">Block IP Address</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="192.0.2.1"
            className="p-2 rounded bg-sentinel-bg border border-sentinel-border focus:border-sentinel-cyan outline-none text-white" />
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for block"
            className="p-2 rounded bg-sentinel-bg border border-sentinel-border focus:border-sentinel-cyan outline-none text-white" />
          <button onClick={handleBlock} disabled={loading}
            className="p-2 rounded bg-sentinel-cyan text-black font-bold hover:opacity-80 disabled:opacity-50 transition-opacity">
            {loading ? "Processing..." : "Block IP"}
          </button>
        </div>
        
        {msg.text && (
          <div className={`mt-4 p-3 rounded border text-sm font-mono ${
            msg.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 
            msg.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 
            'bg-blue-500/10 border-blue-500/30 text-blue-400'
          }`}>
            {msg.text}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-sentinel-border bg-sentinel-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-sentinel-bg text-gray-400">
            <tr>
              <th className="p-3 text-left w-40">Time</th>
              <th className="p-3 text-left w-32">IP</th>
              <th className="p-3 text-left w-24">Action</th>
              <th className="p-3 text-left">Reason</th>
              <th className="p-3 text-left w-24">Analyst</th>
              <th className="p-3 text-left w-24">Status</th>
              <th className="p-3 text-right w-24">Options</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => (
              <tr key={a.id} className="border-t border-sentinel-border hover:bg-sentinel-bg/50">
                <td className="p-3 text-gray-400 text-xs">{new Date(a.timestamp).toLocaleString()}</td>
                <td className="p-3 font-mono text-white">{a.ip}</td>
                <td className="p-3">
                  <span className={`uppercase text-[10px] font-bold px-2 py-1 rounded ${a.action === 'block' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {a.action}
                  </span>
                </td>
                <td className="p-3 text-gray-300 text-xs italic truncate max-w-[200px]" title={a.reason}>
                  {a.reason || "No reason provided"}
                </td>
                <td className="p-3 text-sentinel-cyan font-bold">{a.analyst}</td>
                <td className="p-3">
                  <span className={`font-bold ${a.success ? "text-green-400" : "text-red-400"}`}>
                    {a.success ? "SUCCESS" : "FAILED"}
                  </span>
                </td>
                <td className="p-3 text-right">
                  {a.action === 'block' && a.success && (
                    <button onClick={() => handleUnblock(a.ip)} disabled={loading}
                      className="text-xs border border-red-500 text-red-500 px-3 py-1 rounded hover:bg-red-500 hover:text-white transition-colors font-bold">
                      Unblock
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {actions.length === 0 && (
              <tr><td colSpan="7" className="p-6 text-center text-gray-500">No firewall actions yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
