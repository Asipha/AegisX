import { useEffect, useState } from "react";
import api from "../api";

export default function Rules() {
  const [rules, setRules] = useState([]);
  const [editingId, setEditingId] = useState(null);
  
  const emptyForm = { 
    name: "", 
    event_type: "any", 
    field: "message", 
    operator: "contains", 
    value: "", 
    severity: "high" 
  };
  
  const [form, setForm] = useState(emptyForm);

  const fetchRules = () => api.get("/api/rules").then(r => setRules(r.data));
  useEffect(() => { fetchRules(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.value) return alert("Please fill out Rule Name and Match Value.");
    
    if (editingId) {
      // Update existing rule
      await api.put(`/api/rules/${editingId}`, form);
      setEditingId(null);
    } else {
      // Create new rule
      await api.post("/api/rules", form);
    }
    
    setForm(emptyForm);
    fetchRules();
  };

  const handleEdit = (rule) => {
    setForm({
      name: rule.name,
      event_type: rule.event_type,
      field: rule.field,
      operator: rule.operator,
      value: rule.value,
      severity: rule.severity
    });
    setEditingId(rule.id);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to form
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this rule?")) return;
    await api.delete(`/api/rules/${id}`);
    if (editingId === id) cancelEdit();
    fetchRules();
  };

  const toggle = async (id) => {
    await api.patch(`/api/rules/${id}/toggle`);
    fetchRules();
  };

  const previewText = `IF an event of type "${form.event_type}" has a "${form.field}" field that ${form.operator} "${form.value || '[value]'}", THEN generate a ${form.severity.toUpperCase()} alert.`;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-sentinel-cyan">Custom Detection Rules</h1>
        <p className="text-gray-400 text-sm mt-1">Build logic to automatically trigger alerts based on specific log patterns.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* RULE BUILDER FORM */}
        <div className={`p-6 rounded-lg border bg-sentinel-card transition-colors ${editingId ? 'border-sentinel-cyan shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'border-sentinel-border'}`}>
          <div className="flex justify-between items-center mb-4 border-b border-sentinel-border pb-2">
            <h2 className="text-lg font-bold text-white">
              {editingId ? "Edit Rule" : "Rule Builder"}
            </h2>
            {editingId && (
              <button onClick={cancelEdit} className="text-xs text-gray-400 hover:text-white border border-gray-600 px-2 py-1 rounded">
                Cancel Edit
              </button>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5 text-sm">
            
            <div>
              <label className="block text-gray-400 mb-1">Rule Name</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Admin Login Detection" className="w-full p-2 rounded bg-sentinel-bg border border-sentinel-border focus:border-sentinel-cyan outline-none text-white" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 mb-1">Event Type</label>
                <select value={form.event_type} onChange={e => setForm({...form, event_type: e.target.value})} className="w-full p-2 rounded bg-sentinel-bg border border-sentinel-border text-white">
                  <option value="any">Any Event Type</option>
                  <option value="login_failed">Login Failed</option>
                  <option value="login_success">Login Success</option>
                  <option value="error">Error</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Severity</label>
                <select value={form.severity} onChange={e => setForm({...form, severity: e.target.value})} className="w-full p-2 rounded bg-sentinel-bg border border-sentinel-border text-white">
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-sentinel-bg border border-sentinel-border rounded">
              <label className="block text-gray-400 mb-2 font-bold text-xs uppercase tracking-wider">Condition Logic</label>
              <div className="flex gap-2">
                <select value={form.field} onChange={e => setForm({...form, field: e.target.value})} className="w-1/3 p-2 rounded bg-sentinel-card border border-sentinel-border text-white">
                  <option value="message">Message</option>
                  <option value="source_ip">Source IP</option>
                </select>
                <select value={form.operator} onChange={e => setForm({...form, operator: e.target.value})} className="w-1/3 p-2 rounded bg-sentinel-card border border-sentinel-border text-white">
                  <option value="contains">Contains</option>
                  <option value="equals">Equals</option>
                </select>
                <input value={form.value} onChange={e => setForm({...form, value: e.target.value})} placeholder="Value (e.g. admin)" className="w-1/3 p-2 rounded bg-sentinel-card border border-sentinel-border focus:border-sentinel-cyan outline-none text-white" />
              </div>
            </div>

            <div className="p-3 bg-sentinel-cyan/10 border border-sentinel-cyan rounded">
              <label className="block text-sentinel-cyan mb-1 text-xs font-bold uppercase">Live Preview</label>
              <div className="text-gray-300 font-mono text-xs leading-relaxed">{previewText}</div>
            </div>

            <button type="submit" className="w-full p-3 rounded bg-sentinel-cyan text-black font-bold hover:opacity-90 transition">
              {editingId ? "Save Changes" : "Deploy Rule"}
            </button>
          </form>
        </div>

        {/* ACTIVE RULES LIST */}
        <div className="p-6 rounded-lg border border-sentinel-border bg-sentinel-card">
          <h2 className="text-lg font-bold text-white mb-4 border-b border-sentinel-border pb-2">Active Rules ({rules.length})</h2>
          
          <div className="space-y-3">
            {rules.map(r => (
              <div key={r.id} className={`p-3 border rounded bg-sentinel-bg flex justify-between items-center group transition-colors ${editingId === r.id ? 'border-sentinel-cyan' : 'border-sentinel-border'}`}>
                <div>
                  <div className="text-white font-bold text-sm flex items-center gap-2">
                    {r.name}
                    <span className={`text-[10px] px-2 py-0.5 rounded ${r.severity === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                      {r.severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 font-mono mt-1">
                    IF {r.event_type} · {r.field} {r.operator} "{r.value}"
                  </div>
                </div>
                <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => toggle(r.id)} className={`text-xs px-2 py-1 rounded border ${r.enabled ? 'border-green-500 text-green-500 bg-green-500/10' : 'border-gray-500 text-gray-500'}`}>
                    {r.enabled ? "ON" : "OFF"}
                  </button>
                  <button onClick={() => handleEdit(r)} className="text-xs px-2 py-1 rounded border border-sentinel-cyan text-sentinel-cyan hover:bg-sentinel-cyan hover:text-black transition-colors">
                    ✏️
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="text-xs px-2 py-1 rounded border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors">
                    DEL
                  </button>
                </div>
              </div>
            ))}
            {rules.length === 0 && <div className="text-sm text-gray-500 text-center py-8">No custom rules created yet.</div>}
          </div>
        </div>

      </div>
    </div>
  );
}
