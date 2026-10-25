import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [relatedEvents, setRelatedEvents] = useState([]);
  const [note, setNote] = useState("");
  const [verdict, setVerdict] = useState(null); // Tracks selected verdict before saving
  
  const [searchParams] = useSearchParams();

  const refresh = () => api.get("/api/alerts").then((r) => {
    const activeAlerts = r.data.filter(a => !["true_positive", "false_positive", "resolved"].includes(a.status));
    const sorted = activeAlerts.sort((a, b) => b.id - a.id);
    setAlerts(sorted);
    return sorted;
  });

  useEffect(() => { 
    refresh().then((fetchedAlerts) => {
      const targetId = searchParams.get("id");
      if (targetId) {
        const targetAlert = fetchedAlerts.find(a => a.id.toString() === targetId);
        if (targetAlert) openAlert(targetAlert);
      }
    });
  }, [searchParams]);

  const handleClearTriage = async () => {
    if (!confirm("Are you sure you want to delete ALL active alerts? This cannot be undone.")) return;
    try {
      await api.delete("/api/alerts/all");
      setAlerts([]);
      setSelectedAlert(null);
      setRelatedEvents([]);
    } catch (err) {
      alert("Failed to clear alerts.");
    }
  };

  const openAlert = async (alert) => {
    setSelectedAlert(alert);
    setNote(alert.notes || "");
    setVerdict(null); // Reset verdict selection
    const res = await api.get(`/api/alerts/${alert.id}/events`);
    setRelatedEvents(res.data);
  };

  const handleResolve = async () => {
    if (!selectedAlert || !verdict) return;
    
    // Ask for confirmation
    const confirmMsg = `Are you sure you want to mark this alert as ${verdict.replace("_", " ").toUpperCase()} and move it to the Resolved page?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      // Save both the notes and the final status at the same time
      await api.patch(`/api/alerts/${selectedAlert.id}`, { 
        status: verdict, 
        notes: note 
      });
      setSelectedAlert(null); // Close drawer
      refresh(); // Refresh the queue
    } catch (err) {
      console.error("Resolution failed:", err);
      alert(`Backend Error: ${err.response?.data?.detail || err.message}`);
    }
  };

  const sevColor = (s) => ({
    critical: "text-red-500 border-red-500/30 bg-red-500/10",
    high: "text-orange-500 border-orange-500/30 bg-orange-500/10",
    medium: "text-yellow-500 border-yellow-500/30 bg-yellow-500/10",
    low: "text-blue-500 border-blue-500/30 bg-blue-500/10",
  }[s] || "text-gray-400 border-gray-500 bg-gray-500/10");

  return (
    <div className="p-6 flex gap-6 h-[calc(100vh-64px)] overflow-hidden">
      
      {/* Left side: Alert List */}
      <div className="w-1/3 flex flex-col border-r border-sentinel-border pr-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-sentinel-cyan">Alert Triage</h1>
          <button 
            onClick={handleClearTriage}
            className="text-xs bg-red-500/10 text-red-500 border border-red-500/30 px-3 py-1.5 rounded hover:bg-red-500 hover:text-white transition-colors font-bold uppercase tracking-wider"
          >
            Clear Triage
          </button>
        </div>
        
        <div className="flex-1 overflow-auto space-y-2 pr-2">
          {alerts.map((a) => (
            <div key={a.id} onClick={() => openAlert(a)} 
                 className={`p-3 rounded cursor-pointer border transition-colors ${selectedAlert?.id === a.id ? 'bg-sentinel-bg border-sentinel-cyan' : 'bg-sentinel-card border-sentinel-border hover:border-gray-500'}`}>
              <div className="flex justify-between items-start mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${sevColor(a.severity)}`}>
                  {a.severity}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono">#{a.id}</span>
                  <span className="text-xs text-gray-500">{new Date(a.first_seen).toLocaleTimeString()}</span>
                </div>
              </div>
              <div className="font-bold text-sm text-gray-200 mt-2">{a.title}</div>
              <div className="text-xs text-gray-500 mt-1 truncate">Rule: {a.rule}</div>
            </div>
          ))}
          {alerts.length === 0 && <p className="text-gray-500 text-sm mt-4 text-center">Queue is empty. No active alerts.</p>}
        </div>
      </div>

      {/* Right side: Investigation Drawer */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedAlert ? (
          <div className="flex flex-col h-full">
            <div className="mb-4 border-b border-sentinel-border pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    <span className="text-gray-500 font-mono text-xl mr-3">#{selectedAlert.id}</span>
                    {selectedAlert.title}
                  </h2>
                  <div className="text-sm text-gray-400">Triggered by: <span className="text-sentinel-cyan">{selectedAlert.rule}</span></div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded border uppercase ${sevColor(selectedAlert.severity)}`}>
                  {selectedAlert.severity}
                </span>
              </div>
            </div>

            {/* VERDICT SELECTION BUTTONS */}
            <div className="flex gap-3 mb-4">
              <button onClick={() => setVerdict("true_positive")} 
                className={`flex-1 py-2 rounded border font-bold transition-all uppercase tracking-wider text-sm ${
                  verdict === "true_positive" 
                  ? "bg-red-500 text-white border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" 
                  : "border-red-500 text-red-500 hover:bg-red-500/10"
                }`}>
                ✓ True Positive
              </button>
              <button onClick={() => setVerdict("false_positive")} 
                className={`flex-1 py-2 rounded border font-bold transition-all uppercase tracking-wider text-sm ${
                  verdict === "false_positive" 
                  ? "bg-green-500 text-white border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]" 
                  : "border-green-500 text-green-500 hover:bg-green-500/10"
                }`}>
                ✕ False Positive
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-sentinel-bg border border-sentinel-border rounded p-4 mb-4">
              <h3 className="text-sm font-bold text-gray-300 mb-3 uppercase tracking-wider">Related Log Evidence</h3>
              <div className="space-y-2">
                {relatedEvents.map(e => (
                  <div key={e.id} className="p-2 border-l-2 border-sentinel-cyan bg-sentinel-card font-mono text-xs text-gray-300 flex gap-4">
                    <span className="text-gray-500 flex-shrink-0">[{new Date(e.timestamp).toLocaleTimeString()}]</span>
                    <span className="flex-1 break-all">{e.raw_line}</span>
                  </div>
                ))}
                {relatedEvents.length === 0 && <p className="text-gray-500 text-sm">No specific log lines matched this alert.</p>}
              </div>
            </div>

            {/* NOTES & FINAL RESOLUTION BUTTON */}
            <div className="h-32 flex flex-col">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-gray-400">Investigation Notes</label>
                {/* The main confirm button is now here */}
                <button 
                  onClick={handleResolve} 
                  disabled={!verdict}
                  className={`px-4 py-1.5 text-xs font-bold rounded transition-colors ${
                    verdict 
                    ? "bg-sentinel-cyan text-black hover:opacity-80 shadow-[0_0_10px_rgba(6,182,212,0.4)]" 
                    : "bg-gray-700 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {verdict ? "Save Notes & Resolve Alert" : "Select a Verdict to Resolve"}
                </button>
              </div>
              <textarea 
                value={note} 
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add notes about this investigation before resolving..." 
                className="w-full flex-1 p-2 rounded bg-sentinel-bg border border-sentinel-border focus:border-sentinel-cyan outline-none text-sm text-gray-300 resize-none"
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 border border-dashed border-sentinel-border rounded">
            Select an alert from the left to begin triage.
          </div>
        )}
      </div>
    </div>
  );
}
