import axios from "axios";

// Automatically use the current IP address of the VM
const VM_IP = window.location.hostname;

const api = axios.create({
  baseURL: `http://${VM_IP}:8000`,
  withCredentials: true,
});

export const login = (username, password) => api.post("/auth/login", { username, password });
export const logout = () => api.post("/auth/logout");
export const getMe = () => api.get("/api/me");
export const getStats = () => api.get("/api/stats");
export const getLogs = () => api.get("/api/logs");
export const getAlerts = () => api.get("/api/alerts");
export const updateAlert = (id, payload) => api.patch(`/api/alerts/${id}`, payload);
export const uploadLog = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return api.post("/api/logs/upload", fd);
};
export const getFirewallActions = () => api.get("/api/firewall/actions");
export const blockIP = (ip, reason) => api.post("/api/firewall/block", { ip, reason });
export const unblockIP = (ip) => api.delete(`/api/firewall/unblock/${ip}`);

export default api;
