"use client";

import Link         from "next/link";
import { useState } from "react";
import { useRouter} from "next/navigation";
import bgImage      from "./back.png";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function CompleteShadowLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const router                  = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/login`, {
        method  : "POST",
        headers : { "Content-Type": "application/json" },
        body    : JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || data.detail || "DEFEAT: Unworthy credentials");
        return;
      }

      localStorage.setItem("token", data.access_token);
      router.push("/dashboard");
    } catch (err) {
      setError("THE SHADOWS BLOCK YOUR PATH: Server offline");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className = "min-h-screen flex flex-col relative overflow-hidden bg-black selection:bg-red-900 selection:text-white"
      style     = {{
        backgroundImage    : `url(${bgImage.src})`,
        backgroundSize     : "cover",
        backgroundPosition : "center",
        backgroundRepeat   : "no-repeat"
      }}
    >
      {/* Dark Overlay for better contrast */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />

      {/* Header */}
      <header className="px-8 py-8 relative z-10 w-full">
        <nav className="max-w-[1600px] mx-auto flex justify-between items-center">
          <Link
            href      = "/"
            className = "text-[22px] font-serif tracking-[0.3em] text-white flex items-center gap-4 uppercase drop-shadow-lg"
          >
            <div className="w-5 h-5 flex items-center justify-center border border-red-800 bg-black rotate-45 shadow-[0_0_15px_rgba(153,27,27,0.8)]">
              <div className="w-2 h-2 bg-red-600 shadow-[0_0_8px_rgba(220,38,38,1)]" />
            </div>
            Leadent
          </Link>
          <Link
            href      = "/signup"
            className = "px-6 py-2.5 text-[10px] font-bold text-neutral-400 border border-neutral-800 hover:border-neutral-500 transition-all uppercase tracking-[0.15em] bg-black/30 backdrop-blur-sm rounded-[2px]"
          >
            New Challenger
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <section className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-[440px] bg-[#080808]/40 backdrop-blur-md border border-white/5 p-14 shadow-[0_0_80px_rgba(0,0,0,0.9)] relative rounded-sm">

          {/* Top Left Red Line Accent */}
          <div className="absolute top-0 left-0 w-1/3 h-[2px] bg-red-800/80" />

          {/* Top Right Diagonal Slash Accent */}
          <div className="absolute top-0 right-0 w-8 h-[2px] bg-red-700 rotate-45 origin-right translate-x-1 -translate-y-[6px] opacity-80" />

          <div className="text-center mb-14 mt-4">
            <h1 className="text-2xl font-serif text-white mb-5 tracking-[0.15em] uppercase leading-relaxed drop-shadow-md">
              Enter The<br/>Shadows
            </h1>
            <p className="text-neutral-400 text-[10px] tracking-[0.3em] uppercase font-semibold">
              Prove Your Worth
            </p>
          </div>

          {error && (
            <div className="mb-8 p-3 border-l-2 border-red-700 bg-red-950/20 text-red-500 text-[10px] text-left font-bold uppercase tracking-widest flex items-center gap-3">
              <span className="text-base">⚔️</span> {error}
            </div>
          )}

          <form
            onSubmit  = {handleSubmit}
            className = "flex flex-col gap-10"
          >
            <div className="relative group">
              <input
                type        = "text"
                id          = "username"
                value       = {username}
                onChange    = {(e) => setUsername(e.target.value)}
                required    = {true}
                className   = "w-full bg-transparent border-b border-neutral-600 pb-3 text-white placeholder-transparent focus:outline-none focus:border-red-600 transition-colors peer uppercase text-xs tracking-[0.15em]"
                placeholder = "Fighter ID"
              />
              <label
                htmlFor   = "username"
                className = "absolute left-0 -top-5 text-[9px] font-bold text-white uppercase tracking-[0.2em] transition-all peer-placeholder-shown:text-[10px] peer-placeholder-shown:top-0 peer-placeholder-shown:text-neutral-300 peer-focus:-top-5 peer-focus:text-[9px] peer-focus:text-white"
              >
                Fighter ID
              </label>
            </div>

            <div className="relative group">
              <input
                type        = "password"
                id          = "password"
                value       = {password}
                onChange    = {(e) => setPassword(e.target.value)}
                required    = {true}
                className   = "w-full bg-transparent border-b border-neutral-600 pb-3 text-white placeholder-transparent focus:outline-none focus:border-red-600 transition-colors peer text-xs tracking-widest"
                placeholder = "Secret Art"
              />
              <label
                htmlFor   = "password"
                className = "absolute left-0 -top-5 text-[9px] font-bold text-white uppercase tracking-[0.2em] transition-all peer-placeholder-shown:text-[10px] peer-placeholder-shown:top-0 peer-placeholder-shown:text-neutral-300 peer-focus:-top-5 peer-focus:text-[9px] peer-focus:text-white"
              >
                Secret Art (Password)
              </label>
            </div>

            <button
              type      = "submit"
              disabled  = {loading}
              className = {`mt-4 w-full py-4 text-[10px] font-bold uppercase tracking-[0.25em] transition-all relative rounded-sm ${
                loading
                  ? "bg-neutral-900 text-neutral-500 cursor-not-allowed"
                  : "bg-[#8a3e3e] text-white hover:bg-[#964545] hover:shadow-[0_0_15px_rgba(138,62,62,0.4)] border border-[#a14c4c]/50"
              }`}
            >
              <span className="relative z-10 drop-shadow-md">
                {loading ? "Focusing Chi..." : "Engage Combat"}
              </span>
            </button>
          </form>

          <div className="mt-14 pt-8 text-center text-[9px] text-neutral-500 uppercase tracking-[0.15em]">
            Path undiscovered?{" "}
            <Link
              href      = "/signup"
              className = "text-white hover:text-red-400 font-bold transition-colors ml-1"
            >
              Train Here
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}