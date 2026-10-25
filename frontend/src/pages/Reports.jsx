import { useState } from "react";
import api from "../api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function Reports() {
  const [data] = useState([
    { name: "Critical", count: 4 },
    { name: "High", count: 12 },
    { name: "Medium", count: 25 },
    { name: "Low", count: 40 }
  ]);

  const downloadCSV = async () => {
    try {
      const res = await api.get("/api/reports/export", { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sentinelx_alerts.csv');
      document.body.appendChild(link);
      link.click();
    } catch (e) {
      alert("Failed to export CSV.");
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-sentinel-cyan">Reports & Analytics</h1>
      </div>
      
      <div className="p-6 rounded-lg border border-sentinel-border bg-sentinel-card mb-6">
        <div className="flex justify-between mb-4">
          <h2 className="text-lg">Alert Severity Distribution</h2>
          <button onClick={downloadCSV} className="px-4 py-2 bg-sentinel-cyan text-black font-bold rounded hover:opacity-80 transition">
            Export CSV
          </button>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937' }} />
              <Bar dataKey="count" fill="#06b6d4" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
