import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getStats, getAlerts, getLogs, getMe } from "../api";
import api from "../api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [user, setUser] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [health, setHealth] = useState("Checking...");
  const navigate = useNavigate();
  
  const threatData = [
    { time: "10:00", threats: 2 }, { time: "10:05", threats: 5 },
    { time: "10:10", threats: 3 }, { time: "10:15", threats: 8 },
    { time: "10:20", threats: 12 }, { time: "10:25", threats: 7 },
    { time: "10:30", threats: 4 },
  ];

  useEffect(() => {
    getMe().then(res => setUser(res.data)).catch(console.error);
    getStats().then((res) => {
      setStats(res.data);
      setHealth("Healthy");
    }).catch(() => setHealth("Degraded"));
    getAlerts().then((res) => setAlerts(res.data.slice(0, 10))).catch(() => {});
    getLogs().then((res) => setLogs(res.data.slice(0, 10))).catch(() => {});

    const fetchMetrics = () => {
      api.get("/api/system/health").then((res) => setMetrics(res.data)).catch(console.error);
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);
    return () => clearInterval(interval);
  }, []);

  const cards = [
    { label: "Total Events", value: stats?.total_events ?? 0, color: "text-white", glow: "hover:shadow-[0_0_15px_rgba(255,255,255,0.2)]" },
    { label: "Critical", value: stats?.critical ?? 0, color: "text-red-500", glow: "hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] border-red-500/50" },
    { label: "High", value: stats?.high ?? 0, color: "text-orange-500", glow: "hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] border-orange-500/50" },
    { label: "Medium", value: stats?.medium ?? 0, color: "text-yellow-500", glow: "hover:shadow-[0_0_15px_rgba(234,179,8,0.4)]" },
    { label: "Low", value: stats?.low ?? 0, color: "text-blue-500", glow: "hover:shadow-[0_0_15px_rgba(59,130,246,0.4)]" },
    { label: "Active Incidents", value: stats?.active_incidents ?? 0, color: "text-sentinel-cyan", glow: "hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] border-sentinel-cyan/50" },
  ];

  const gaugeData = (val, fill) => [{ name: "value", value: val, fill: fill }];

  const recentActivity = [
    ...alerts.map(a => ({ type: 'alert', data: a })),
    ...logs.map(l => ({ type: 'log', data: l }))
  ].sort((a, b) => {
    const dateA = a.type === 'alert' ? new Date(a.data.first_seen) : new Date(a.data.uploaded);
    const dateB = b.type === 'alert' ? new Date(b.data.first_seen) : new Date(b.data.uploaded);
    return dateB - dateA;
  }).slice(0, 8);

  return (
    <div className="p-6">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-4 bg-sentinel-card p-3 rounded-lg border border-sentinel-border">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 uppercase tracking-wider">System Health:</span>
            <span className={`text-xs font-bold flex items-center gap-1 ${health === "Healthy" ? "text-green-400" : "text-red-400"}`}>
              <span className={`w-2 h-2 rounded-full ${health === "Healthy" ? "bg-green-400 animate-pulse" : "bg-red-400"}`}></span>
              {health}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Network:</span>
            <span className="text-xs font-bold text-sentinel-cyan">Connected</span>
          </div>
        </div>
        
        <button onClick={() => setSoundEnabled(!soundEnabled)}
          className={`text-xs px-3 py-1 rounded border transition-colors flex items-center gap-2 ${soundEnabled ? "border-sentinel-cyan text-sentinel-cyan bg-sentinel-cyan/10" : "border-gray-600 text-gray-500"}`}>
          {soundEnabled ? "🔊 Sound ON" : "🔇 Sound OFF"}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.label} className={`p-4 rounded-lg border border-sentinel-border bg-sentinel-card transition-all duration-300 ${c.glow}`}>
            <div className={`text-3xl font-bold ${c.color}`}>{c.value}</div>
            <div className="text-gray-400 text-xs mt-1 uppercase tracking-wider">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Middle Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Threat Graph */}
        <div className="p-4 rounded-lg border border-sentinel-border bg-sentinel-card lg:col-span-2">
          <h2 className="text-sm font-bold text-gray-300 mb-4 uppercase">Threat Activity (Last 30m)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={threatData}>
                <XAxis dataKey="time" stroke="#4b5563" tick={{fill: '#6b7280', fontSize: 12}} />
                <YAxis stroke="#4b5563" tick={{fill: '#6b7280', fontSize: 12}} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937' }} />
                <Line type="monotone" dataKey="threats" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} animationDuration={1500} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Kali Host Health */}
        <div className="p-6 rounded-lg border border-sentinel-border bg-sentinel-card lg:col-span-1 flex flex-col justify-between">
          <h2 className="text-sm font-bold text-gray-300 mb-4 uppercase">Kali Host Health</h2>
          {metrics ? (
            <div className="flex-1 flex flex-col justify-around space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-gray-400 w-1/3">CPU</div>
                <div className="w-24 h-24 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="75%" outerRadius="100%" barSize={10} data={gaugeData(metrics.cpu_percent, "#06b6d4")} startAngle={90} endAngle={-270}>
                      <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                      <RadialBar dataKey="value" cornerRadius={10} className="drop-shadow-[0_0_8px_#06b6d4]" />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <span className="absolute text-lg font-bold text-sentinel-cyan">{Math.round(metrics.cpu_percent)}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-gray-400 w-1/3">RAM</div>
                <div className="w-24 h-24 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="75%" outerRadius="100%" barSize={10} data={gaugeData(metrics.ram_percent, "#8b5cf6")} startAngle={90} endAngle={-270}>
                      <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                      <RadialBar dataKey="value" cornerRadius={10} className="drop-shadow-[0_0_8px_#8b5cf6]" />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <span className="absolute text-lg font-bold text-sentinel-violet">{Math.round(metrics.ram_percent)}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-gray-400 w-1/3">Disk</div>
                <div className="w-24 h-24 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="75%" outerRadius="100%" barSize={10} data={gaugeData(metrics.disk_percent, "#f59e0b")} startAngle={90} endAngle={-270}>
                      <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                      <RadialBar dataKey="value" cornerRadius={10} className="drop-shadow-[0_0_8px_#f59e0b]" />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <span className="absolute text-lg font-bold text-yellow-500">{Math.round(metrics.disk_percent)}%</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-500 text-center mt-4">Loading metrics...</div>
          )}
        </div>
      </div>

      {/* Bottom Section: Recent Activity Blocks */}
      <div className="grid grid-cols-1 gap-6">
        <div className="p-4 rounded-lg border border-sentinel-border bg-sentinel-card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-gray-300 uppercase flex items-center gap-2">
              <span className="w-2 h-2 bg-sentinel-cyan rounded-full animate-pulse"></span>
              Recent Activity Blocks
            </h2>
            <div className="flex gap-4 text-xs">
              <Link to="/logs" className="text-sentinel-cyan hover:underline">View All Logs</Link>
              <Link to="/alerts" className="text-sentinel-cyan hover:underline">View All Alerts</Link>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentActivity.map((item, index) => {
              if (item.type === 'alert') {
                const a = item.data;
                const isCrit = a.severity === 'critical';
                return (
                  <div 
                    key={`block-alert-${index}`} 
                    onClick={() => navigate(`/alerts?id=${a.id}`)}
                    className={`p-4 rounded-lg border-l-4 bg-sentinel-bg flex flex-col justify-between h-28 transition-all hover:scale-105 cursor-pointer ${isCrit ? 'border-l-red-500 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-l-orange-500 hover:shadow-[0_0_15px_rgba(249,115,22,0.3)]'}`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isCrit ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                          {a.severity.toUpperCase()}
                        </span>
                        <div className="flex gap-2 items-center">
                          <span className="text-[10px] text-gray-500 font-mono">#{a.id}</span>
                          <span className="text-[10px] text-gray-500">{new Date(a.first_seen).toLocaleTimeString()}</span>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-gray-200 truncate">{a.title}</div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 truncate">Rule: {a.rule}</div>
                  </div>
                );
              } else {
                const l = item.data;
                return (
                  <div key={`block-log-${index}`} className="p-4 rounded-lg border-l-4 border-l-sentinel-cyan bg-sentinel-bg flex flex-col justify-between h-28 transition-all hover:scale-105 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sentinel-cyan/20 text-sentinel-cyan">
                          INGEST
                        </span>
                        <span className="text-[10px] text-gray-500">{new Date(l.uploaded).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-sm font-bold text-gray-200 truncate">{l.filename}</div>
                    </div>
                    <div className="text-xs text-sentinel-violet mt-2">{l.event_count} events parsed</div>
                  </div>
                );
              }
            })}
            {recentActivity.length === 0 && <div className="text-xs text-gray-500 col-span-4 text-center py-4">No recent activity.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
