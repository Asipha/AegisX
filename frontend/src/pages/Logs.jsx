import { useEffect, useState, useMemo, useCallback } from "react";
import api from "../api";

export default function Logs() {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [events, setEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");

  const fetchEvents = useCallback(async (fileId) => {
    if (!fileId) return;
    try {
      const res = await api.get(`/api/logs/${fileId}/events?limit=200`);
      setEvents(res.data);
    } catch (err) { console.error(err); }
  }, []);

  const refreshList = async () => {
    try {
      const res = await api.get("/api/logs");
      setFiles(res.data);
      return res.data;
    } catch (err) { return []; }
  };

  useEffect(() => {
    refreshList().then((data) => {
      const savedId = localStorage.getItem("selectedLogId");
      if (savedId) {
        const fileToRestore = data.find(f => f.id.toString() === savedId);
        if (fileToRestore) setSelectedFile(fileToRestore);
      }
    });
  }, []);

  // Poll for updates every 3 seconds
  useEffect(() => {
    if (!selectedFile) return;
    fetchEvents(selectedFile.id);
    const interval = setInterval(() => {
      fetchEvents(selectedFile.id);
      refreshList();
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedFile, fetchEvents]);

  const toggleLiveFeed = async () => {
    if (isLive) {
      await api.post("/api/logs/live/stop");
      setIsLive(false);
    } else {
      setLoading(true);
      try {
        const res = await api.post("/api/logs/live/start");
        setIsLive(true);
        // Auto-select the live stream file
        const data = await refreshList();
        const liveFile = data.find(f => f.id === res.data.file_id);
        if (liveFile) setSelectedFile(liveFile);
      } catch (err) {
        alert("Failed to start live monitor: " + (err.response?.data?.detail || err.message));
      }
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setStatus("Uploading...");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await api.post("/api/logs/upload", fd);
      setStatus(`✅ Uploaded ${res.data.filename}`);
      const updatedList = await refreshList();
      const newlyUploaded = updatedList.find(f => f.id === res.data.id);
      if (newlyUploaded) setSelectedFile(newlyUploaded);
    } catch (err) { setStatus("❌ Upload failed."); }
    setLoading(false);
  };

  const deleteFile = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Delete this log file?")) return;
    await api.delete(`/api/logs/${id}`);
    if (selectedFile?.id === id) setSelectedFile(null);
    refreshList();
  };

  const openLog = (file) => {
    setSelectedFile(file);
    setSearchTerm("");
    localStorage.setItem("selectedLogId", file.id);
  };

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (eventTypeFilter !== "all" && e.event_type !== eventTypeFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const haystack = [e.raw_line || "", e.source_ip || "", e.event_type || ""].join(" ").toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [events, searchTerm, eventTypeFilter]);

  return (
    <div className="p-6 flex gap-6 h-[calc(100vh-64px)] overflow-hidden">
      
      {/* LEFT COLUMN */}
      <div className="w-1/3 flex flex-col h-full">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-sentinel-cyan">Log Management</h1>
        </div>

        <div className="p-4 rounded-lg border border-sentinel-border bg-sentinel-card mb-4 space-y-4">
          
          {/* THE NEW LIVE FEED BUTTON */}
          <div>
            <label className="block mb-2 text-sm text-gray-300 font-bold">System Live Feed</label>
            <button onClick={toggleLiveFeed} disabled={loading} className={`w-full py-2 rounded font-bold transition-colors ${isLive ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-sentinel-violet text-white hover:bg-opacity-80'}`}>
              {isLive ? "🛑 Stop Live Auth Log" : "📡 Start Live Auth Log"}
            </button>
            <p className="text-xs text-gray-500 mt-1">Streams /var/log/auth.log automatically.</p>
          </div>
          
          <div className="border-t border-sentinel-border pt-4">
            <label className="block mb-2 text-sm text-gray-300 font-bold">Upload Snapshot</label>
            <input type="file" accept=".log,.txt,.json,.csv" onChange={handleUpload} disabled={loading}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-sentinel-cyan file:text-black hover:file:bg-opacity-80" />
          </div>
          {status && <p className={`text-xs font-bold ${status.includes('✅') ? 'text-green-400' : status.includes('❌') ? 'text-red-400' : 'text-sentinel-cyan'}`}>{status}</p>}
        </div>

        <div className="flex-1 rounded-lg border border-sentinel-border bg-sentinel-card overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-sentinel-bg text-gray-400 sticky top-0">
              <tr>
                <th className="p-3 text-left">File</th>
                <th className="p-3 text-center">Events</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id} onClick={() => openLog(f)} 
                    className={`border-t border-sentinel-border cursor-pointer transition-colors ${selectedFile?.id === f.id ? 'bg-sentinel-bg border-l-4 border-l-sentinel-cyan' : 'hover:bg-sentinel-bg/50'}`}>
                  <td className="p-3 truncate max-w-[150px]">{f.filename}</td>
                  <td className="p-3 text-center text-sentinel-cyan">{f.event_count}</td>
                  <td className="p-3 text-right">
                    <button onClick={(e) => deleteFile(e, f.id)} className="text-red-500 hover:text-red-400 p-1">🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="w-2/3 flex flex-col h-full">
        {selectedFile ? (
          <div className="border border-sentinel-border bg-sentinel-card rounded-lg flex flex-col h-full">
            <div className="p-4 border-b border-sentinel-border bg-sentinel-bg">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h2 className="font-bold text-sentinel-cyan text-lg flex items-center gap-2">
                    {selectedFile.filename}
                    <span className="text-[10px] bg-sentinel-cyan/20 text-sentinel-cyan px-2 py-0.5 rounded border border-sentinel-cyan/30 flex items-center gap-1 animate-pulse">
                      <span className="w-1.5 h-1.5 bg-sentinel-cyan rounded-full"></span> AUTO-REFRESH
                    </span>
                  </h2>
                </div>
                <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-white text-lg">✕</button>
              </div>
              
              <div className="flex gap-2">
                <input type="text" placeholder="Search by IP, keyword..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 p-2 rounded bg-sentinel-card border border-sentinel-border focus:border-sentinel-cyan outline-none text-sm text-white" />
                <select value={eventTypeFilter} onChange={(e) => setEventTypeFilter(e.target.value)}
                  className="w-1/3 p-2 rounded bg-sentinel-card border border-sentinel-border text-sm text-gray-300 focus:border-sentinel-cyan outline-none">
                  <option value="all">All Types</option>
                  <option value="login_failed">Failed Login</option>
                  <option value="login_success">Success Login</option>
                  <option value="sudo_execution">Sudo Command</option>
                </select>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-0">
              <table className="w-full text-sm font-mono">
                <thead className="bg-sentinel-bg text-gray-500 sticky top-0 z-10 text-xs">
                  <tr>
                    <th className="p-3 text-left w-24">Event ID</th>
                    <th className="p-3 text-left w-32">Time</th>
                    <th className="p-3 text-left w-32">Type</th>
                    <th className="p-3 text-left">Raw Log</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((e, i) => {
                    const eventId = `EVT-${(events.length - i).toString().padStart(4, '0')}`;
                    return (
                      <tr key={e.id} className="border-t border-sentinel-border hover:bg-sentinel-bg/50">
                        <td className="p-3 text-sentinel-violet font-bold">{eventId}</td>
                        <td className="p-3 text-gray-500 text-xs">{new Date(e.timestamp).toLocaleTimeString()}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            e.event_type === 'login_failed' ? 'bg-red-500/20 text-red-400' :
                            e.event_type === 'login_success' ? 'bg-green-500/20 text-green-400' :
                            e.event_type === 'sudo_execution' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {e.event_type}
                          </span>
                        </td>
                        <td className="p-3 text-gray-300 break-all">{e.raw_line}</td>
                      </tr>
                    );
                  })}
                  {filteredEvents.length === 0 && (
                    <tr><td colSpan="4" className="p-8 text-center text-gray-500">No events match your filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-sentinel-border rounded-lg flex items-center justify-center h-full text-gray-500 bg-sentinel-card">
            Select a log file or start the live feed.
          </div>
        )}
      </div>
    </div>
  );
}
