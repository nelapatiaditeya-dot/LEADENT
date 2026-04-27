"use client";

import Link                       from "next/link";
import { useEffect, useState }    from "react";
import { useRouter }              from "next/navigation";

export default function Landing() {
  const router                        = useRouter();
  const [isLoggedIn, setIsLoggedIn]   = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
  };

  return (
    <main
      className = "min-h-screen flex flex-col relative bg-black selection:bg-red-900 selection:text-white"
      style     = {{
        backgroundImage      : "url('/back.png')",
        backgroundSize       : "cover",
        backgroundPosition   : "center",
        backgroundRepeat     : "no-repeat",
        backgroundAttachment : "fixed"
      }}
    >
      {/* Dark Overlay to make text readable against the background */}
      <div className="absolute inset-0 bg-black/70 pointer-events-none z-0" />

      {/* ── HEADER ── */}
      <header className="px-8 py-6 relative z-10 border-b border-red-900/50 bg-black/50 backdrop-blur-sm">
        <nav className="max-w-6xl mx-auto flex justify-between items-center">

          <Link href="/" className="text-xl font-serif tracking-[0.3em] text-white uppercase flex items-center gap-3">
            <div className="w-4 h-4 bg-red-700 rotate-45 border border-red-500" />
            Leadent
          </Link>

          <div className="flex gap-4 items-center">
            {isLoggedIn ? (
              <>
                <button
                  onClick   = {handleLogout}
                  className = "px-6 py-2 text-xs font-bold text-neutral-400 hover:text-red-500 transition-colors uppercase tracking-widest"
                >
                  Abandon Quest
                </button>
                <Link
                  href      = "/dashboard"
                  className = "px-6 py-2 text-xs font-bold text-white bg-red-900 border border-red-700 hover:bg-red-800 transition-colors uppercase tracking-widest rounded-sm"
                >
                  Enter Dojo
                </Link>
              </>
            ) : (
              <>
                <Link
                  href      = "/login"
                  className = "px-6 py-2 text-xs font-bold text-neutral-400 hover:text-white transition-colors uppercase tracking-widest"
                >
                  Prove Worth
                </Link>
                <Link
                  href      = "/signup"
                  className = "px-6 py-2 text-xs font-bold text-white bg-red-900 border border-red-700 hover:bg-red-800 transition-colors uppercase tracking-widest rounded-sm"
                >
                  New Challenger
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* ── HERO ── */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-20 text-center border-b border-red-900/30">
        <div className="max-w-3xl mx-auto">
          <p className="text-red-500 text-xs font-bold tracking-[0.4em] uppercase mb-6">
            Forged in Shadows
          </p>

          <h1 className="text-5xl md:text-7xl font-serif text-white tracking-[0.1em] uppercase mb-8 leading-tight drop-shadow-lg">
            Master The Arts. <br />
            <span className="text-red-700">Conquer Your Destiny.</span>
          </h1>

          <p className="text-neutral-400 text-base md:text-lg leading-relaxed mb-12 max-w-2xl mx-auto tracking-wide">
            Leadent equips warriors with a disciplined training schedule and a lethal learning path. Prove your worth, track your power, and strike with precision.
          </p>

          <div className="flex gap-6 justify-center flex-wrap">
            {isLoggedIn ? (
              <Link
                href      = "/dashboard"
                className = "px-10 py-4 text-xs font-bold text-white bg-red-900 border border-red-700 hover:bg-red-800 transition-colors uppercase tracking-[0.2em] rounded-sm"
              >
                Resume Training
              </Link>
            ) : (
              <>
                <Link
                  href      = "/signup"
                  className = "px-10 py-4 text-xs font-bold text-white bg-red-900 border border-red-700 hover:bg-red-800 transition-colors uppercase tracking-[0.2em] rounded-sm"
                >
                  Begin Journey
                </Link>
                <Link
                  href      = "/login"
                  className = "px-10 py-4 text-xs font-bold text-neutral-300 border border-neutral-700 hover:border-red-700 hover:text-white bg-black/50 transition-colors uppercase tracking-[0.2em] rounded-sm"
                >
                  Return to Dojo
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="relative z-10 bg-black/60 py-24 px-6 border-b border-red-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-serif text-white tracking-[0.1em] uppercase">
              The Two Disciplines
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Feature 1 */}
            <div className="border border-neutral-800 bg-[#080808]/80 p-10 hover:border-red-800 transition-colors">
              <span className="text-red-600 text-xs font-bold tracking-[0.2em] uppercase block mb-4">
                Scroll 01
              </span>
              <h3 className="text-xl font-serif text-white uppercase tracking-widest mb-4">
                The Dojo Timetable
              </h3>
              <p className="text-neutral-400 text-sm leading-relaxed mb-6">
                Warriors forge discipline through structure. Block off training hours, set grueling durations, and let Leadent command your focus to build unbreakable habits.
              </p>
              <ul className="text-neutral-500 text-xs font-bold tracking-widest uppercase flex flex-col gap-3">
                <li>⚔️ Tactical time-blocking</li>
                <li>⚔️ Combat schedules</li>
                <li>⚔️ Unyielding streak tracking</li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="border border-neutral-800 bg-[#080808]/80 p-10 hover:border-red-800 transition-colors">
              <span className="text-red-600 text-xs font-bold tracking-[0.2em] uppercase block mb-4">
                Scroll 02
              </span>
              <h3 className="text-xl font-serif text-white uppercase tracking-widest mb-4">
                The Shadow Path
              </h3>
              <p className="text-neutral-400 text-sm leading-relaxed mb-6">
                Your combat style is unique. Our AI Grandmaster generates a dynamic path tailored to your strengths, adapting as you strike down your weaknesses.
              </p>
              <ul className="text-neutral-500 text-xs font-bold tracking-widest uppercase flex flex-col gap-3">
                <li>⚔️ AI adapts to your pace</li>
                <li>⚔️ Master all disciplines</li>
                <li>⚔️ Dynamic difficulty scaling</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 bg-[#050505] py-8 px-6 text-center border-t border-black">
        <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-[0.2em]">
          © 2026 Leadent. The Shadows Await.
        </p>
      </footer>
    </main>
  );
}