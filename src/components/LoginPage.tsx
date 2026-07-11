import { useState, FormEvent } from "react";
import { api } from "../utils/api";
import { setToken } from "../utils/auth";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    setLoading(true);
    try {
      const result = await api<{ token?: string; error?: string }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ password }),
          noAuth: true,
        },
      );

      if (result.token) {
        setToken(result.token);
        onLoginSuccess();
      } else {
        setError(result.message || result.error || "Invalid password");
      }
    } catch {
      setError("Failed to connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
      <div className="w-full max-w-sm mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <svg className="w-14 h-14" viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="8" fill="#4285F4" />
                <circle cx="19" cy="19" r="12" fill="white" />
                <circle cx="19" cy="19" r="10" fill="#4285F4" />
                <rect x="13" y="16" width="3" height="7" rx="1" fill="white" />
                <rect x="18" y="12" width="3" height="11" rx="1" fill="white" />
                <rect x="23" y="18" width="3" height="5" rx="1" fill="white" />
                <path
                  d="M27 27L34 34"
                  stroke="white"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-800">
              BigQuery Viewer
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Enter password to continue
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                autoFocus
                disabled={loading}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent
                           disabled:opacity-50 disabled:cursor-not-allowed
                           placeholder:text-gray-400"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5
                         bg-[#1a73e8] text-white text-sm font-medium rounded-lg
                         hover:bg-[#1557b0] transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : null}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
