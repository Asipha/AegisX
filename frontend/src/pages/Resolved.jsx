import { useEffect, useState } from "react";
import api from "../api";

export default function Resolved() {
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [relatedEvents, setRelatedEvents] = useState([]);

  useEffect(() => {
    api.get("/api/alerts").then(r => {
      // Only show alerts that are resolved
      const resolved = r.data.filter(a => ["true_positive", "false_positive", "resolved"].includes(a.status));
      const sorted = resolved.sort((a, b) => b.id - a.id);
      setAlerts(sorted);
    });
  }, []);

  const openAlert = async (alert) => {
    setSelectedAlert(alert);
    const res = await api.get(`/api/alerts/${alert.id}/events`);
    setRelatedEvents(res.data);
  };

  const getStatusBadge = (status) => {
    if (status === "true_positive") {
      return <span className="text-red-500 font-bold text-[10px] uppercase border border-red-500/30 bg-red-500/10 px-2 py-1 rounded shadow-[0_0_8px_rgba(239,68,68,0.3)]">True Positive</span>;
    }
    if (status === "false_positive") {
      return <span className="text-green-500 font-bold text-[10px] uppercase border border-green-500/30 bg-green-500/10 px-2 py-1 rounded shadow-[0_0_8px_rgba(34,197,94,0.3)]">False Positive</span>;
    }
    return <span className="text-blue-400 font-bold text-[10px] uppercase border border-blue-500/30 bg-blue-500/10 px-2 py-1 rounded">Resolved</span>;
  };

  return (
    <div className="p-6 flex gap-6 h-[calc(100vh-64px)] overflow-hidden">
      
      {/* Left side: Resolved Table */}
      <div className="w-1/3 flex flex-col border-r border-sentinel-border pr-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-sentinel-cyan">Resolved Alerts</h1>
          <p className="text-gray-400 text-sm mt-1">Archive of all closed investigations.</p>
        </div>

        <div className="flex-1 rounded-lg border border-sentinel-border bg-sentinel-card overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-sentinel-bg text-gray-400 sticky top-0">
              <tr>
                <th className="p-3 text-left">ID</th>
                <th className="p-3 text-left">Title & Description</th>
                <th className="p-3 text-left">Triaged By</th>
                <th className="p-3 text-left">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map(a => (
                <tr key={a.id} onClick={() => openAlert(a)} 
                    className={`border-t border-sentinel-border cursor-pointer transition-colors ${selectedAlert?.id === a.id ? 'bg-sentinel-bg border-l-4 border-l-sentinel-cyan' : 'hover:bg-sentinel-bg/50'}`}>
                  <td className="p-3 text-gray-500 font-mono">#{a.id}</td>
                  <td className="p-3">
                    <div className="font-bold text-gray-200">{a.title}</div>
                    <div className="text-xs text-gray-500 truncate w-64">{a.description}</div>
                  </td>
                  <td className="p-3 text-sentinel-cyan font-bold">{a.triaged_by || "Unknown"}</td>
                  <td className="p-3">{getStatusBadge(a.status)}</td>
                </tr>
              ))}
              {alerts.length === 0 && (
                <tr><td colSpan="4" className="p-8 text-center text-gray-500">No resolved alerts yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right side: Details Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedAlert ? (
          <div className="flex flex-col h-full border border-sentinel-border bg-sentinel-card rounded-lg">
            
            <div className="p-4 border-b border-sentinel-border bg-sentinel-bg">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-xl font-bold text-white">{selectedAlert.title}</h2>
                {getStatusBadge(selectedAlert.status)}
              </div>
              <div className="text-sm text-gray-400">{selectedAlert.description}</div>
            </div>
            
            <div className="p-4 flex flex-col gap-3 text-sm border-b border-sentinel-border">
              <div className="flex justify-between pb-2 border-b border-sentinel-border/50">
                <span className="text-gray-500">Alert ID:</span>
                <span className="text-white font-mono">#{selectedAlert.id}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-sentinel-border/50">
                <span className="text-gray-500">Severity:</span>
                <span className="text-white font-bold uppercase">{selectedAlert.severity}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-sentinel-border/50">
                <span className="text-gray-500">Triaged By:</span>
                <span className="text-sentinel-cyan font-bold">{selectedAlert.triaged_by || "Unknown"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Closed On:</span>
                <span className="text-white">{new Date(selectedAlert.last_seen).toLocaleString()}</span>
              </div>
            </div>

            {/* INVESTIGATION NOTES SECTION */}
            <div className="p-4 bg-sentinel-card border-b border-sentinel-border">
              <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Investigation Notes</h3>
              <p className="text-sm text-gray-300 font-mono bg-sentinel-bg p-3 rounded border border-sentinel-border min-h-[60px]">
                {selectedAlert.notes || "No notes were added during triage."}
              </p>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-sentinel-bg rounded-b-lg">
              <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Related Log Evidence</h3>
              <div className="space-y-2">
                {relatedEvents.map(e => (
                  <div key={e.id} className="p-2 border-l-2 border-gray-600 bg-sentinel-card font-mono text-xs text-gray-300 flex gap-4">
                    <span className="text-gray-500 flex-shrink-0">[{new Date(e.timestamp).toLocaleTimeString()}]</span>
                    <span className="flex-1 break-all">{e.raw_line}</span>
                  </div>
                ))}
                {relatedEvents.length === 0 && <p className="text-gray-500 text-sm">No specific log lines matched this alert.</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 border border-dashed border-sentinel-border rounded-lg bg-sentinel-card">
            Select a resolved alert to view its investigation details and evidence.
          </div>
        )}
      </div>
    </div>
  );
}
