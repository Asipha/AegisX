import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(username, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sentinel-bg">
      <div className="w-96 p-8 rounded-lg border border-sentinel-border bg-sentinel-card animate-pulse-glow">
        <div className="flex items-center gap-3 mb-2"><img src="/aegis-logo.jpg" alt="Logo" className="h-10 w-10 rounded drop-shadow-[0_0_15px_rgba(139,92,246,0.8)]" /><h1 className="text-3xl font-bold text-sentinel-cyan">AegisX</h1></div>
        <p className="text-gray-400 mb-6 text-sm">Security Operations Center</p>
        {error && (
          <div className="bg-red-900/50 border border-red-500 p-2 rounded mb-4 text-red-300 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 rounded bg-sentinel-bg border border-sentinel-border focus:border-sentinel-cyan outline-none"
          />
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded bg-sentinel-bg border border-sentinel-border focus:border-sentinel-cyan outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-3 text-xs text-gray-400"
            >
              {showPw ? "HIDE" : "SHOW"}
            </button>
          </div>
          <button
            type="submit"
            className="w-full p-3 rounded bg-sentinel-cyan text-black font-bold hover:opacity-90 transition"
          >
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );
}
