"use client";

import Link         from "next/link";
import { useState } from "react";
import { useRouter} from "next/navigation";

// Directly importing the image from your login folder so Next.js finds it guaranteed!
import bgImage      from "../login/back.png";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function CompleteShadowSignup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role,     setRole]     = useState("student");
  const [schoolId, setSchoolId] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const router                  = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/register`, {
        method  : "POST",
        headers : { "Content-Type": "application/json" },
        body    : JSON.stringify({
          username,
          password,
          role,
          school_id : parseInt(schoolId) || 0,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "THE PATH IS BLOCKED: Registration failed");
        return;
      }

      router.push("/login");
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
        backgroundImage      : `url(${bgImage.src})`, // Using the imported image
        backgroundSize       : "cover",
        backgroundPosition   : "center",
        backgroundRepeat     : "no-repeat",
        backgroundAttachment : "fixed"
      }}
    >
      {/* Dark Overlay for depth */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none z-0" />

      {/* ── HEADER ── */}
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
          <div className="flex gap-4 items-center">
            <Link
              href      = "/login"
              className = "px-6 py-2.5 text-[10px] font-bold text-neutral-400 border border-neutral-800 hover:border-neutral-500 transition-all uppercase tracking-[0.15em] bg-black/30 backdrop-blur-sm rounded-[2px]"
            >
              Return to Dojo
            </Link>
          </div>
        </nav>
      </header>

      {/* ── MAIN CONTENT ── */}
      <section className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-[480px] bg-[#080808]/40 backdrop-blur-md border border-white/5 p-12 shadow-[0_0_80px_rgba(0,0,0,0.9)] relative rounded-sm">

          {/* Top Left Red Line Accent */}
          <div className="absolute top-0 left-0 w-1/3 h-[2px] bg-red-800/80" />

          {/* Top Right Diagonal Slash Accent */}
          <div className="absolute top-0 right-0 w-8 h-[2px] bg-red-700 rotate-45 origin-right translate-x-1 -translate-y-[6px] opacity-80" />

          <div className="text-center mb-12 mt-2">
            <h1 className="text-2xl font-serif text-white mb-4 tracking-[0.15em] uppercase leading-relaxed drop-shadow-md">
              Forge Your<br/>Legacy
            </h1>
            <p className="text-neutral-400 text-[10px] tracking-[0.3em] uppercase font-semibold">
              Step Into The Shadows
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
            {/* Username */}
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
                Fighter ID (Username)
              </label>
            </div>

            {/* Password */}
            <div className="relative group">
              <input
                type        = "password"
                id          = "password"
                value       = {password}
                onChange    = {(e) => setPassword(e.target.value)}
                required    = {true}
                minLength   = {8}
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

            {/* Role Dropdown */}
            <div className="relative group flex flex-col gap-2 pt-1">
              <label
                htmlFor   = "role"
                className = "text-[9px] font-bold text-neutral-300 uppercase tracking-[0.2em]"
              >
                Choose Path (Role)
              </label>
              <select
                id        = "role"
                value     = {role}
                onChange  = {(e) => setRole(e.target.value)}
                className = "w-full bg-transparent border-b border-neutral-600 pb-3 text-white focus:outline-none focus:border-red-600 transition-colors uppercase text-xs tracking-[0.15em] appearance-none cursor-pointer"
              >
                <option value="student" className="bg-black text-white">Acolyte (Student)</option>
                <option value="parent"  className="bg-black text-white">Elder (Parent)</option>
              </select>
              {/* Custom dropdown arrow */}
              <div className="absolute right-0 bottom-4 pointer-events-none text-neutral-500 text-xs">
                ▼
              </div>
            </div>

            {/* School ID */}
            <div className="relative group mt-2">
              <input
                type        = "number"
                id          = "schoolId"
                value       = {schoolId}
                onChange    = {(e) => setSchoolId(e.target.value)}
                required    = {true}
                className   = "w-full bg-transparent border-b border-neutral-600 pb-3 text-white placeholder-transparent focus:outline-none focus:border-red-600 transition-colors peer text-xs tracking-widest [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder = "Dojo ID"
              />
              <label
                htmlFor   = "schoolId"
                className = "absolute left-0 -top-5 text-[9px] font-bold text-white uppercase tracking-[0.2em] transition-all peer-placeholder-shown:text-[10px] peer-placeholder-shown:top-0 peer-placeholder-shown:text-neutral-300 peer-focus:-top-5 peer-focus:text-[9px] peer-focus:text-white"
              >
                Dojo ID (School ID)
              </label>
            </div>

            {/* Submit Button */}
            <button
              type      = "submit"
              disabled  = {loading}
              className = {`mt-6 w-full py-4 text-[10px] font-bold uppercase tracking-[0.25em] transition-all relative rounded-sm ${
                loading
                  ? "bg-neutral-900 text-neutral-500 cursor-not-allowed"
                  : "bg-[#8a3e3e] text-white hover:bg-[#964545] hover:shadow-[0_0_15px_rgba(138,62,62,0.4)] border border-[#a14c4c]/50"
              }`}
            >
              <span className="relative z-10 drop-shadow-md">
                {loading ? "Forging..." : "Accept Destiny"}
              </span>
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-12 pt-8 border-t border-neutral-800 text-center flex flex-col gap-4">
            <div className="text-[9px] text-neutral-500 uppercase tracking-[0.15em]">
              Path already chosen?{" "}
              <Link
                href      = "/login"
                className = "text-white hover:text-red-400 font-bold transition-colors ml-1"
              >
                Prove Worth
              </Link>
            </div>

            <div className="text-center">
              <Link
                href      = "/"
                className = "text-[9px] text-neutral-600 hover:text-neutral-400 uppercase tracking-[0.15em] transition-colors"
              >
                ← Retreat to Gateway
              </Link>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}