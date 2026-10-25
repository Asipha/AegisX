import { Link } from "react-router-dom";

export default function Assets() {
  const assets = [
    { name: "kali-vm", ip: "192.168.1.48", type: "Workstation", status: "Online" },
    { name: "db-server-01", ip: "10.0.0.5", type: "Database", status: "Online" },
    { name: "web-proxy", ip: "10.0.0.10", type: "Web Server", status: "Degraded" },
    { name: "gw-firewall", ip: "192.168.1.1", type: "Firewall", status: "Online" }
  ];

  return (
    <div className="min-h-screen bg-sentinel-bg p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-sentinel-cyan">Asset & Host Inventory</h1>
        <Link to="/dashboard" className="text-sm text-gray-400 hover:text-sentinel-cyan">← Dashboard</Link>
      </div>
      <div className="rounded-lg border border-sentinel-border bg-sentinel-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-sentinel-bg text-gray-400">
            <tr><th className="p-3 text-left">Hostname</th><th className="p-3 text-left">IP Address</th><th className="p-3 text-left">Type</th><th className="p-3 text-left">Status</th></tr>
          </thead>
          <tbody>
            {assets.map((a, i) => (
              <tr key={i} className="border-t border-sentinel-border">
                <td className="p-3">{a.name}</td>
                <td className="p-3 text-sentinel-cyan">{a.ip}</td>
                <td className="p-3 text-gray-400">{a.type}</td>
                <td className="p-3"><span className={a.status === "Online" ? "text-green-400" : "text-yellow-400"}>{a.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
