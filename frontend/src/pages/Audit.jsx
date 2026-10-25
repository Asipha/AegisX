import { useEffect, useState } from "react";
import api from "../api";

export default function Audit() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get("/api/audit").then((res) => setLogs(res.data)).catch(console.error);
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-sentinel-cyan">Audit Logs</h1>
        <p className="text-gray-400 text-sm mt-1">Record of all analyst actions across the platform.</p>
      </div>
      
      <div className="rounded-lg border border-sentinel-border bg-sentinel-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-sentinel-bg text-gray-400">
            <tr>
              <th className="p-3 text-left">Time</th>
              <th className="p-3 text-left">User</th>
              <th className="p-3 text-left">Action</th>
              <th className="p-3 text-left">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-sentinel-border hover:bg-sentinel-bg/50">
                <td className="p-3 text-gray-400">{new Date(l.time).toLocaleString()}</td>
                <td className="p-3 text-sentinel-cyan font-bold">{l.user}</td>
                <td className="p-3">{l.action}</td>
                <td className="p-3 text-gray-400">{l.details}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan="4" className="p-6 text-center text-gray-500">No audit logs yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
