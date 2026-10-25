import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getMe, logout, getAlerts } from "./api";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [newAlertsCount, setNewAlertsCount] = useState(0);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    getMe().then((res) => setUser(res.data)).catch(() => navigate("/"));

    const checkAlerts = async () => {
      try {
        const res = await getAlerts();
        const newCount = res.data.filter(a => a.status === 'new').length;
        if (newCount > newAlertsCount && newAlertsCount !== 0) {
          setToast(`🚨 ${newCount - newAlertsCount} new alert(s) detected!`);
          setTimeout(() => setToast(null), 5000);
        }
        setNewAlertsCount(newCount);
      } catch (e) {}
    };
    checkAlerts();
    const interval = setInterval(checkAlerts, 5000);
    return () => clearInterval(interval);
  }, [navigate, newAlertsCount]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const primaryLinks = [
    { path: "/dashboard", label: "Overview" },
    { path: "/alerts", label: "Triage" },
    { path: "/resolved", label: "Resolved" },
    { path: "/logs", label: "Logs" },
    { path: "/rules", label: "Rules" },
    { path: "/firewall", label: "Firewall" },
  ];

  const secondaryLinks = [
    { path: "/assets", label: "Assets" },
    { path: "/reports", label: "Reports" },
    { path: "/settings", label: "Settings" },
  ];

  const renderLink = (link) => {
    const isActive = location.pathname === link.path;
    return (
      <Link
        key={link.path}
        to={link.path}
        className={`relative text-sm xl:text-base tracking-wide uppercase font-bold px-3 py-2 rounded transition-all duration-200 ${
          isActive
            ? "text-sentinel-cyan drop-shadow-[0_0_10px_rgba(6,182,212,0.9)]"
            : "text-gray-400 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]"
        }`}
      >
        {link.label}
        {link.label === "Triage" && newAlertsCount > 0 && (
          <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]">
            {newAlertsCount}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-sentinel-bg flex flex-col">
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-sentinel-card border border-red-500 text-white px-4 py-3 rounded shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-[slideIn_0.3s_ease-out] flex items-center gap-3">
          <span className="text-red-500 text-lg">⚠</span>
          <span className="font-bold text-sm">{toast}</span>
        </div>
      )}

      <header className="border-b border-sentinel-border bg-sentinel-card/80 backdrop-blur-md sticky top-0 z-40 shadow-[0_2px_20px_rgba(6,182,212,0.1)]">
        <div className="flex justify-between items-center px-6 py-5">
          
          {/* Logo */}
          <div className="flex items-center gap-14">
            <div className="flex items-center gap-5">
              <img src="/aegis-logo.jpg" alt="AegisX Logo" className="h-16 w-16 rounded-lg drop-shadow-[0_0_30px_rgba(139,92,246,1)] border border-sentinel-violet/50" />
              <h1 className="text-4xl font-black tracking-[0.2em] text-sentinel-cyan drop-shadow-[0_0_25px_rgba(6,182,212,1)] whitespace-nowrap">
                AEGIS<span className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,1)]">X</span>
              </h1>
            </div>

            {/* Primary Nav Links */}
            <nav className="flex items-center gap-4 xl:gap-6">
              {primaryLinks.map(renderLink)}
            </nav>

            {/* Visual Divider */}
            <div className="h-6 w-px bg-sentinel-border"></div>

            {/* Secondary Nav Links */}
            <nav className="flex items-center gap-4 xl:gap-6">
              {secondaryLinks.map(renderLink)}
            </nav>
          </div>

          {/* Right Side: Status + User */}
          <div className="flex items-center gap-5">
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_6px_#4ade80]"></span>
                <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider">System Online</span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Signed in as <span className="text-sentinel-cyan font-semibold">{user?.username || "..."}</span></div>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs px-4 py-2 border border-sentinel-border rounded text-gray-400 hover:border-red-500 hover:text-red-400 hover:shadow-[0_0_10px_rgba(239,68,68,0.4)] transition-all duration-200 uppercase tracking-wider font-semibold"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
