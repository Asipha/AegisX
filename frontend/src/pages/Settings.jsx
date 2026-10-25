import { useState } from "react";
import api from "../api";

export default function Settings() {
  const [demoMode, setDemoMode] = useState(localStorage.getItem("demoMode") === "true");
  const [loading, setLoading] = useState(false);

  const toggleDemoMode = () => {
    const newVal = !demoMode;
    setDemoMode(newVal);
    localStorage.setItem("demoMode", newVal);
    window.location.reload(); // Reload to apply the change across the app
  };

  const injectDemoData = async () => {
    setLoading(true);
    try {
      // Generate 10 fake alerts via the backend
      for (let i = 0; i < 10; i++) {
        await api.post("/api/logs/upload", new FormData());
      }
      alert("Demo data injected! Check the Dashboard.");
    } catch (e) {
      alert("Failed to inject demo data.");
    }
    setLoading(false);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-sentinel-cyan">System Settings</h1>
      </div>
      
      <div className="p-6 rounded-lg border border-sentinel-border bg-sentinel-card max-w-2xl">
        <h2 className="text-lg mb-4">Environment Configuration</h2>
        
        <div className="flex items-center justify-between p-4 border border-sentinel-border rounded mb-4">
          <div>
            <div className="font-bold">Demonstration Mode</div>
            <div className="text-xs text-gray-400">Toggle between synthetic security events and actual uploaded data.</div>
          </div>
          <button 
            onClick={toggleDemoMode}
            className={`px-4 py-2 rounded font-bold transition-colors ${demoMode ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-white'}`}
          >
            {demoMode ? "ENABLED" : "DISABLED"}
          </button>
        </div>

        <div className="flex items-center justify-between p-4 border border-sentinel-border rounded">
          <div>
            <div className="font-bold">Inject Demo Data</div>
            <div className="text-xs text-gray-400">Populate the dashboard with simulated alerts for testing.</div>
          </div>
          <button 
            onClick={injectDemoData}
            disabled={loading}
            className="px-4 py-2 rounded font-bold bg-sentinel-cyan text-black hover:opacity-80 transition-colors disabled:opacity-50"
          >
            {loading ? "Injecting..." : "Inject Data"}
          </button>
        </div>
      </div>
    </div>
  );
}
