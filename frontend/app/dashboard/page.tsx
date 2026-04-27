"use client";

import Link                             from "next/link";
import { useEffect, useState, useRef }  from "react";
import { useRouter }                    from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface User {
  id:       number;
  username: string;
  role:     string;
  level?:   number;
  xp?:      number;
}

interface Subject {
  id:               number;
  name:             string;
  description:      string;
  total_topics:     number;
  completed_topics: number;
  progress:         number;
  status:           string;
  difficulty:       string;
  color?:           string;
}

/* ─── Painted Dojo Background ────────────────────────────────────────────────── */
function DojoBackground() {
  return (
    <div
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         0,
        overflow:       "hidden",
        pointerEvents:  "none"
      }}
    >
      {/* Deep night sky */}
      <div
        style={{
          position:   "absolute",
          inset:      0,
          background: "linear-gradient(180deg,#050008 0%,#160012 15%,#280018 28%,#1a000f 45%,#0e0008 65%,#040003 100%)"
        }}
      />

      {/* Moon*/}
      <div
        style={{
          position:     "absolute",
          top:          "5%",
          left:         "50%",
          transform:    "translateX(-50%)",
          width:        110,
          height:       110,
          borderRadius: "50%",
          background:   "radial-gradient(circle at 38% 38%, #ecdcc4, #c8a87a 45%, #8a5c35 80%, #3e1e08)",
          boxShadow:    "0 0 70px rgba(220,170,100,0.22), 0 0 140px rgba(200,130,60,0.08)",
        }}
      />

      {/* Moon craters */}
      {[
        [22, 20, 16],
        [55, 42, 10],
        [-30, 30, 7],
        [10, 58, 5]
      ].map(([dx, dy, r], i) => (
        <div
          key={i}
          style={{
            position:     "absolute",
            top:          `calc(5% + ${50 + dy}px)`,
            left:         `calc(50% + ${dx}px)`,
            width:        r,
            height:       r,
            borderRadius: "50%",
            background:   "rgba(0,0,0,0.16)"
          }}
        />
      ))}

      {/* Moon ambient halo */}
      <div
        style={{
          position:     "absolute",
          top:          "calc(5% - 30px)",
          left:         "calc(50% - 90px)",
          width:        260,
          height:       260,
          borderRadius: "50%",
          background:   "radial-gradient(circle, rgba(210,150,60,0.12) 25%, transparent 70%)"
        }}
      />

      {/* Stars */}
      {Array.from({ length: 90 }).map((_, i) => {
        const x  = ((i * 137.508) % 100).toFixed(3);
        const y  = ((i * 97.3) % 40).toFixed(3);
        const s  = (0.4 + Math.abs(Math.sin(i * 0.7)) * 2.2).toFixed(3);
        const op = (0.25 + Math.abs(Math.sin(i * 1.4)) * 0.65).toFixed(3);
        const ad = ((i * 0.12) % 3).toFixed(3);
        const dr = (2 + (i % 4)).toFixed(3);

        return (
          <div
            key={i}
            style={{
              position:     "absolute",
              left:         `${x}%`,
              top:          `${y}%`,
              width:        Number(s),
              height:       Number(s),
              borderRadius: "50%",
              background:   "#fff",
              opacity:      Number(op),
              animation:    `twinkle ${dr}s ease-in-out ${ad}s infinite alternate`
            }}
          />
        );
      })}

      {/* Full scene SVG */}
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMax slice"
        style={{
          position: "absolute",
          bottom:   0,
          left:     0,
          width:    "100%",
          height:   "100%"
        }}
      >
        <defs>
          <radialGradient id="rg1" cx="50%" cy="100%" r="55%">
            <stop offset="0%" stopColor="rgba(130,0,0,0.4)" />
            <stop offset="45%" stopColor="rgba(60,0,20,0.18)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <radialGradient id="moonAura" cx="50%" cy="11%" r="28%">
            <stop offset="0%" stopColor="rgba(200,120,40,0.13)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <filter id="glow4"><feGaussianBlur stdDeviation="4" /></filter>
          <filter id="glow8"><feGaussianBlur stdDeviation="8" /></filter>
          <filter id="glow2"><feGaussianBlur stdDeviation="2" /></filter>
          <filter id="glow12"><feGaussianBlur stdDeviation="12" /></filter>
        </defs>

        {/* Moon aura overlay */}
        <rect x="0" y="0" width="1440" height="900" fill="url(#moonAura)" />

        {/* Far mountain range 1 */}
        <path d="M0,570 L100,400 L220,490 L360,330 L500,450 L620,280 L740,410 L860,260 L980,390 L1100,310 L1230,440 L1360,350 L1440,470 L1440,900 L0,900Z" fill="#0c0310" />

        {/* Far mountain range 2 */}
        <path d="M0,610 L90,490 L190,545 L310,430 L440,510 L560,400 L680,470 L800,355 L920,445 L1040,390 L1160,490 L1280,415 L1400,505 L1440,540 L1440,900 L0,900Z" fill="#090208" />

        {/* Horizon glow (red ground fire) */}
        <rect x="0" y="350" width="1440" height="550" fill="url(#rg1)" />

        {/* ── LEFT PAGODA ── */}
        <g transform="translate(60,170)">
          <rect x="95" y="340" width="90" height="130" fill="#070109" />
          <rect x="120" y="360" width="40" height="60" rx="20" fill="rgba(180,70,0,0.6)" filter="url(#glow4)" />
          <rect x="124" y="362" width="32" height="56" rx="16" fill="rgba(240,110,0,0.35)" />

          {[
            [55, 340, 170, 30],
            [65, 312, 150, 28],
            [75, 286, 130, 26],
            [85, 262, 110, 24],
            [95, 240, 90, 22],
            [104, 220, 72, 20],
          ].map(([x, y, w, h], i) => (
            <g key={i}>
              <rect x={x} y={y} width={w} height={h} rx="2" fill="#070109" />
              <circle cx={x} cy={y} r="3" fill="rgba(200,55,0,0.7)" />
              <circle cx={x + Number(w)} cy={y} r="3" fill="rgba(200,55,0,0.7)" />
            </g>
          ))}

          <line x1="140" y1="220" x2="140" y2="172" stroke="#070109" strokeWidth="5" />
          <circle cx="140" cy="168" r="8" fill="#070109" />
          <circle cx="140" cy="168" r="4" fill="rgba(200,80,0,0.8)" />
        </g>

        {/* ── RIGHT PAGODA ── */}
        <g transform="translate(1200,210)">
          <rect x="72" y="295" width="70" height="110" fill="#070109" />
          <rect x="94" y="312" width="26" height="48" rx="13" fill="rgba(180,70,0,0.55)" filter="url(#glow4)" />

          {[
            [40, 295, 134, 26],
            [49, 271, 116, 24],
            [57, 249, 100, 22],
            [65, 229, 84, 20],
            [72, 211, 70, 18],
          ].map(([x, y, w, h], i) => (
            <g key={i}>
              <rect x={x} y={y} width={w} height={h} rx="2" fill="#070109" />
              <circle cx={x} cy={y} r="2.5" fill="rgba(200,55,0,0.65)" />
              <circle cx={x + Number(w)} cy={y} r="2.5" fill="rgba(200,55,0,0.65)" />
            </g>
          ))}

          <line x1="107" y1="211" x2="107" y2="168" stroke="#070109" strokeWidth="4" />
          <circle cx="107" cy="164" r="6" fill="#070109" />
          <circle cx="107" cy="164" r="3" fill="rgba(200,80,0,0.8)" />
        </g>

        {/* ── CENTER TORII GATE ── */}
        <g opacity="0.65">
          <rect x="580" y="360" width="280" height="18" rx="6" fill="rgba(160,20,0,0.4)" filter="url(#glow8)" />
          <rect x="574" y="362" width="292" height="16" rx="5" fill="#2a0404" />
          <rect x="590" y="390" width="260" height="10" rx="3" fill="#220303" />
          <rect x="600" y="378" width="16" height="230" rx="4" fill="#1e0303" />
          <rect x="824" y="378" width="16" height="230" rx="4" fill="#1e0303" />
          <rect x="574" y="360" width="292" height="18" rx="5" fill="rgba(204,40,0,0.15)" filter="url(#glow4)" />
        </g>

        {/* ── HANGING LANTERNS (left side) ── */}
        <g filter="url(#glow2)">
          <line x1="260" y1="0" x2="256" y2="130" stroke="rgba(80,20,0,0.7)" strokeWidth="1.5" />
          <g style={{ animation: "lanternSway 3s ease-in-out infinite", transformOrigin: "256px 130px" }}>
            <rect x="245" y="118" width="22" height="6" rx="2" fill="#6a1000" />
            <rect x="243" y="148" width="26" height="6" rx="2" fill="#6a1000" />
            <ellipse cx="256" cy="133" rx="13" ry="20" fill="#a82000" />
            <ellipse cx="256" cy="133" rx="9" ry="15" fill="rgba(255,120,0,0.45)" />
            <line x1="256" y1="154" x2="256" y2="162" stroke="#6a1000" strokeWidth="1.5" />
            <ellipse cx="256" cy="164" rx="5" ry="3" fill="#6a1000" />
          </g>

          <line x1="340" y1="0" x2="337" y2="110" stroke="rgba(80,20,0,0.7)" strokeWidth="1" />
          <g style={{ animation: "lanternSway 4s ease-in-out 0.5s infinite", transformOrigin: "337px 110px" }}>
            <rect x="327" y="100" width="20" height="5" rx="2" fill="#6a1000" />
            <rect x="325" y="128" width="24" height="5" rx="2" fill="#6a1000" />
            <ellipse cx="337" cy="114" rx="12" ry="18" fill="#8c1800" />
            <ellipse cx="337" cy="114" rx="8" ry="13" fill="rgba(255,100,0,0.4)" />
          </g>
        </g>

        {/* ── HANGING LANTERNS (right side) ── */}
        <g filter="url(#glow2)">
          <line x1="1100" y1="0" x2="1104" y2="140" stroke="rgba(80,20,0,0.7)" strokeWidth="1.5" />
          <g style={{ animation: "lanternSway 3.5s ease-in-out 0.3s infinite", transformOrigin: "1104px 140px" }}>
            <rect x="1093" y="128" width="22" height="6" rx="2" fill="#6a1000" />
            <rect x="1091" y="158" width="26" height="6" rx="2" fill="#6a1000" />
            <ellipse cx="1104" cy="143" rx="13" ry="20" fill="#a82000" />
            <ellipse cx="1104" cy="143" rx="9" ry="15" fill="rgba(255,120,0,0.45)" />
            <line x1="1104" y1="164" x2="1104" y2="172" stroke="#6a1000" strokeWidth="1.5" />
            <ellipse cx="1104" cy="174" rx="5" ry="3" fill="#6a1000" />
          </g>

          <line x1="1180" y1="0" x2="1183" y2="115" stroke="rgba(80,20,0,0.7)" strokeWidth="1" />
          <g style={{ animation: "lanternSway 2.8s ease-in-out 1s infinite", transformOrigin: "1183px 115px" }}>
            <rect x="1173" y="105" width="20" height="5" rx="2" fill="#6a1000" />
            <rect x="1171" y="133" width="24" height="5" rx="2" fill="#6a1000" />
            <ellipse cx="1183" cy="119" rx="12" ry="18" fill="#8c1800" />
            <ellipse cx="1183" cy="119" rx="8" ry="13" fill="rgba(255,100,0,0.4)" />
          </g>
        </g>

        {/* Petal particles */}
        {Array.from({ length: 18 }).map((_, i) => {
          const ad = (i * 0.35).toFixed(3);
          return (
            <ellipse
              key={i}
              cx={80 + i * 73}
              cy={-30 + (i % 5) * 60}
              rx="4"
              ry="6"
              fill={`rgba(180,${30 + i * 5},40,0.55)`}
              transform={`rotate(${20 + i * 15},${80 + i * 73},${-30 + (i % 5) * 60})`}
              style={{ animation: `petalFall ${5 + (i % 4)}s ${ad}s linear infinite` }}
            />
          );
        })}

        {/* Ground / stones */}
        <path d="M0,790 Q360,758 720,766 Q1080,774 1440,755 L1440,900 L0,900Z" fill="#080110" />
        <path d="M0,812 Q360,785 720,792 Q1080,799 1440,780 L1440,900 L0,900Z" fill="#050009" />

        {/* Stone steps */}
        <rect x="572" y="765" width="296" height="20" rx="3" fill="rgba(22,8,30,0.9)" />
        <rect x="614" y="745" width="212" height="20" rx="3" fill="rgba(22,8,30,0.9)" />
        <rect x="654" y="725" width="132" height="20" rx="3" fill="rgba(22,8,30,0.9)" />

        {/* Ground fire embers */}
        <ellipse cx="720" cy="790" rx="340" ry="28" fill="rgba(100,10,0,0.35)" filter="url(#glow12)" />
        <ellipse cx="720" cy="810" rx="220" ry="18" fill="rgba(60,0,5,0.25)" filter="url(#glow8)" />
      </svg>

      {/* Depth fog at bottom */}
      <div
        style={{
          position:       "absolute",
          bottom:         0,
          left:           0,
          right:          0,
          height:         "35%",
          background:     "linear-gradient(180deg,transparent,rgba(20,0,12,0.55) 60%,rgba(5,0,4,0.85))",
          pointerEvents:  "none"
        }}
      />

      {/* Vignette */}
      <div
        style={{
          position:   "absolute",
          inset:      0,
          background: "radial-gradient(ellipse 80% 75% at 50% 45%,transparent 25%,rgba(0,0,0,0.65) 100%)"
        }}
      />
    </div>
  );
}

/* ─── Canvas particles ───────────────────────────────────────────────────────── */
function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c   = ref.current!;
    const ctx = c.getContext("2d")!;
    let W     = c.width  = window.innerWidth;
    let H     = c.height = window.innerHeight;

    const ps = Array.from({ length: 55 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.8 + 0.3,
      s: Math.random() * 0.28 + 0.07,
      d: (Math.random() - 0.5) * 0.18,
      o: Math.random() * 0.38 + 0.05,
      h: Math.random() > 0.8 ? 15 : 0,
    }));

    let raf: number;
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of ps) {
        p.y -= p.s;
        p.x += p.d + Math.sin(p.y * 0.014) * 0.12;
        if (p.y < -5) {
          p.y = H + 5;
          p.x = Math.random() * W;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.h},80%,65%,${p.o})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };

    tick();
    const onR = () => {
      W = c.width  = window.innerWidth;
      H = c.height = window.innerHeight;
    };

    window.addEventListener("resize", onR);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onR);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{
        position:       "fixed",
        inset:          0,
        pointerEvents:  "none",
        zIndex:         1
      }}
    />
  );
}

/* ─── Realm Card ─────────────────────────────────────────────────────────────── */
const ICONS: Record<string, string> = {
  Coding:            "⚔️",
  Python:            "🐍",
  JavaScript:        "⚡",
  Java:              "🔥",
  "Data Structures": "🗡️",
  Algorithms:        "🌀",
  Maths:             "☯️",
  Social:            "🌍",
  Systems:           "🏯"
};

const DIFF_MAP: Record<string, number> = {
  Beginner:     1,
  Intermediate: 2,
  Advanced:     3,
  Master:       4
};

function RealmCard({ subject, index }: { subject: Subject; index: number }) {
  const [hov,   setHov]   = useState(false);
  const [slash, setSlash] = useState(false);

  const locked = subject.status === "locked";
  const done   = subject.status === "completed";
  const icon   = ICONS[subject.name] ?? "🏯";
  const diff   = DIFF_MAP[subject.difficulty] || 1;

  const doSlash = () => {
    if (locked) return;
    setSlash(true);
    setTimeout(() => setSlash(false), 480);
  };

  const barBg   = locked ? "#2a2a2a" : done ? "linear-gradient(90deg,#ffaa00,#ffdd66)" : "linear-gradient(90deg,#8b0000,#cc0000,#ff4444)";
  const barGlow = locked ? "none"    : done ? "0 0 14px #ffaa00"                        : "0 0 12px rgba(204,0,0,0.8)";

  return (
    <div
      onMouseEnter={() => !locked && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position:       "relative",
        animationDelay: `${index * 80}ms`,
        animation:      "cardRise 0.85s cubic-bezier(0.22,1,0.36,1) both",
        width:          "100%",
        boxSizing:      "border-box"
      }}
    >
      {/* Animated border glow on hover */}
      {hov && !locked && (
        <div
          style={{
            position:     "absolute",
            inset:        -1.5,
            borderRadius: 22,
            zIndex:       0,
            background:   done
              ? "linear-gradient(135deg,rgba(255,170,0,0.5),rgba(100,50,0,0.2),rgba(255,170,0,0.5))"
              : "linear-gradient(135deg,rgba(204,0,0,0.55),rgba(80,0,0,0.2),rgba(204,0,0,0.55))",
            animation:    "borderSpin 2.5s linear infinite",
          }}
        />
      )}

      <div
        style={{
          position:       "relative",
          zIndex:         1,
          borderRadius:   20,
          overflow:       "hidden",
          display:        "flex",
          flexDirection:  "column",
          background:     hov && !locked
            ? "linear-gradient(155deg,#1e0808 0%,#120606 45%,#0e0e0e 100%)"
            : "linear-gradient(155deg,#130505 0%,#0c0c0c 60%,#0a0a0a 100%)",
          border:         hov && !locked
            ? done ? "1px solid rgba(255,170,0,0.5)" : "1px solid rgba(204,0,0,0.5)"
            : "1px solid rgba(255,255,255,0.055)",
          boxShadow:      hov && !locked
            ? done ? "0 24px 60px rgba(0,0,0,0.85),0 0 40px rgba(200,120,0,0.18)" : "0 24px 60px rgba(0,0,0,0.85),0 0 40px rgba(204,0,0,0.2),inset 0 0 50px rgba(204,0,0,0.04)"
            : "0 8px 30px rgba(0,0,0,0.75),inset 0 1px 0 rgba(255,255,255,0.035)",
          transform:      hov && !locked ? "translateY(-14px) scale(1.03)" : "translateY(0) scale(1)",
          transition:     "all 0.42s cubic-bezier(0.22,1,0.36,1)",
          filter:         locked ? "grayscale(0.85) brightness(0.42)" : "none",
        }}
      >

        {/* Top accent bar */}
        <div
          style={{
            height:     2,
            background: done ? "linear-gradient(90deg,transparent,#ffaa00,transparent)" : locked ? "rgba(255,255,255,0.04)" : "linear-gradient(90deg,transparent,#cc0000,transparent)",
            opacity:    hov ? 1 : 0.38,
            transition: "opacity 0.3s",
          }}
        />

        {/* Slash flash */}
        {slash && (
          <div
            style={{
              position:       "absolute",
              inset:          0,
              zIndex:         20,
              overflow:       "hidden",
              borderRadius:   20,
              pointerEvents:  "none"
            }}
          >
            <div
              style={{
                position:   "absolute",
                top:        0,
                left:       "-55%",
                width:      "45%",
                height:     "100%",
                background: "linear-gradient(108deg,transparent,rgba(255,120,120,0.55),transparent)",
                animation:  "slashBeam 0.44s ease-out forwards",
              }}
            />
          </div>
        )}

        {/* Icon */}
        <div
          style={{
            display:        "flex",
            justifyContent: "center",
            alignItems:     "center",
            padding:        "30px 0 14px",
            position:       "relative"
          }}
        >
          <svg
            style={{
              position:   "absolute",
              width:      140,
              height:     140,
              opacity:    hov ? 0.32 : 0.13,
              transition: "opacity 0.4s",
              animation:  locked ? "none" : "runeRotate 22s linear infinite"
            }}
            viewBox="0 0 140 140"
          >
            <circle cx="70" cy="70" r="60" fill="none" stroke="#cc0000" strokeWidth="0.6" strokeDasharray="4 9" />
            {Array.from({ length: 12 }).map((_, i) => {
              const a = (i / 12) * Math.PI * 2;
              return (
                <polygon
                  key={i}
                  points={`${70 + 60 * Math.cos(a)},${70 + 60 * Math.sin(a) - 5} ${70 + 60 * Math.cos(a) + 3.5},${70 + 60 * Math.sin(a) + 4} ${70 + 60 * Math.cos(a) - 3.5},${70 + 60 * Math.sin(a) + 4}`}
                  fill="rgba(204,0,0,0.85)"
                />
              );
            })}
            <circle cx="70" cy="70" r="48" fill="none" stroke="rgba(204,0,0,0.18)" strokeWidth="0.4" strokeDasharray="2 14" />
          </svg>
          <div
            style={{
              fontSize:   56,
              position:   "relative",
              zIndex:     2,
              filter:     hov && !locked ? "drop-shadow(0 0 20px rgba(204,0,0,0.95))" : "none",
              transform:  hov && !locked ? "scale(1.28) rotate(-8deg)" : "scale(1) rotate(0deg)",
              transition: "all 0.4s ease",
            }}
          >
            {icon}
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            padding:        "0 22px 22px",
            display:        "flex",
            flexDirection:  "column",
            flex:           1
          }}
        >
          <h3
            style={{
              fontFamily:     "Georgia,serif",
              fontWeight:     900,
              fontSize:       "1.25rem",
              textTransform:  "uppercase",
              letterSpacing:  "0.22em",
              textAlign:      "center",
              color:          done ? "#ffcc44" : "#ebebeb",
              marginBottom:   8,
              textShadow:     hov && !locked ? "0 0 22px rgba(204,0,0,0.85),0 2px 8px rgba(0,0,0,0.9)" : "0 2px 8px rgba(0,0,0,0.8)",
              transition:     "text-shadow 0.3s",
            }}
          >
            {subject.name}
          </h3>

          <p
            style={{
              textAlign:    "center",
              fontSize:     11,
              color:        "rgba(155,125,125,0.72)",
              lineHeight:   1.65,
              marginBottom: 18,
              minHeight:    34
            }}
          >
            {subject.description}
          </p>

          <div
            style={{
              display:        "flex",
              justifyContent: "space-between",
              fontSize:       9,
              fontWeight:     900,
              textTransform:  "uppercase",
              letterSpacing:  "0.22em",
              marginBottom:   8
            }}
          >
            <span style={{ color: "#3e3e3e" }}>Mastery</span>
            <span style={{ color: done ? "#ffaa00" : "#cc0000" }}>{subject.completed_topics} / {subject.total_topics}</span>
          </div>

          <div
            style={{
              height:       7,
              borderRadius: 99,
              background:   "rgba(255,255,255,0.04)",
              border:       "1px solid rgba(255,255,255,0.04)",
              padding:      1,
              overflow:     "hidden",
              marginBottom: 20,
              position:     "relative"
            }}
          >
            <div
              style={{
                height:       "100%",
                borderRadius: 99,
                width:        `${subject.progress}%`,
                background:   barBg,
                boxShadow:    barGlow,
                transition:   "width 1.6s cubic-bezier(0.22,1,0.36,1)"
              }}
            />
            {!locked && (
              <div
                style={{
                  position:   "absolute",
                  inset:      0,
                  background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent)",
                  animation:  "shimmer 2.4s ease-in-out infinite"
                }}
              />
            )}
          </div>

          <Link
            href={locked ? "#" : `/learn/${encodeURIComponent(subject.name)}`}
            onClick={e => {
              if (locked) e.preventDefault();
              else doSlash();
            }}
            style={{
              display:        "block",
              width:          "100%",
              padding:        "15px 0",
              textAlign:      "center",
              fontFamily:     "Georgia,serif",
              fontWeight:     900,
              fontSize:       11,
              letterSpacing:  "0.3em",
              textTransform:  "uppercase",
              borderRadius:   12,
              textDecoration: "none",
              cursor:         locked ? "not-allowed" : "pointer",
              position:       "relative",
              overflow:       "hidden",
              background:     locked ? "rgba(255,255,255,0.02)" : done ? "linear-gradient(135deg,#7a5000,#cc8800)" : "linear-gradient(135deg,#3d0000,#8b0000)",
              border:         locked ? "1px solid rgba(255,255,255,0.04)" : done ? "1px solid rgba(255,170,0,0.35)" : "1px solid rgba(204,0,0,0.38)",
              color:          locked ? "#2e2e2e" : done ? "#ffdd88" : "#ff9999",
              boxShadow:      hov && !locked ? done ? "0 0 28px rgba(255,150,0,0.3)" : "0 0 28px rgba(204,0,0,0.38)" : "none",
              transition:     "all 0.3s",
            }}
          >
            {hov && !locked && (
              <div
                style={{
                  position:   "absolute",
                  inset:      0,
                  background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent)",
                  animation:  "shimmer 1.6s ease-in-out infinite"
                }}
              />
            )}
            <span style={{ position: "relative", zIndex: 1 }}>
              {locked ? "⛓  Sealed" : done ? "⚡  Re-Enter Realm" : "⚔  Enter Realm"}
            </span>
          </Link>

          {!locked && (
            <div
              style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                gap:            4,
                marginTop:      11
              }}
            >
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  style={{
                    width:        7,
                    height:       7,
                    borderRadius: 2,
                    background:   i <= diff ? "#cc0000" : "rgba(255,255,255,0.07)",
                    boxShadow:    i <= diff ? "0 0 7px #cc0000" : "none",
                    transition:   "all 0.3s"
                  }}
                />
              ))}
              <span
                style={{
                  fontSize:       8,
                  color:          "#3a3a3a",
                  fontWeight:     900,
                  letterSpacing:  "0.2em",
                  textTransform:  "uppercase",
                  marginLeft:     5
                }}
              >
                {subject.difficulty}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Dashboard ──────────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const router                  = useRouter();
  const [user, setUser]         = useState<User | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading]   = useState(true);
  const [xpPulse, setXpPulse]   = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const userRes = await fetch(`${API_URL}/api/user`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!userRes.ok) throw new Error("Unauthorized");
        const userData = await userRes.json();
        setUser(userData);

        try {
          const subRes = await fetch(`${API_URL}/api/subjects`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (subRes.ok) {
            const subData = await subRes.json();
            const extractedSubjects = Array.isArray(subData) ? subData : (subData?.data || subData?.subjects || []);
            setSubjects(extractedSubjects);
          } else {
            setSubjects([]);
          }
        } catch (subErr) {
          setSubjects([]);
        }

      } catch (err) {
        localStorage.removeItem("token");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const id = setInterval(() => {
      setXpPulse(true);
      setTimeout(() => setXpPulse(false), 800);
    }, 4500);

    return () => clearInterval(id);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  if (loading) return (
    <main
      style={{
        minHeight:      "100vh",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        background:     "#000"
      }}
    >
      <DojoBackground />
      <div
        style={{
          width:        66,
          height:       66,
          border:       "2px solid #8b0000",
          borderTop:    "2px solid #cc0000",
          borderRadius: "50%",
          animation:    "spin 1.2s linear infinite",
          boxShadow:    "0 0 28px rgba(204,0,0,0.5)",
          position:     "relative",
          zIndex:       10
        }}
      />
      <p
        style={{
          marginTop:      22,
          fontSize:       10,
          letterSpacing:  "0.4em",
          textTransform:  "uppercase",
          color:          "#444",
          animation:      "fadePulse 1.5s ease-in-out infinite",
          position:       "relative",
          zIndex:         10
        }}
      >
        Entering the dojo…
      </p>
    </main>
  );

  const safeSubjects = Array.isArray(subjects) ? subjects : [];

  // Filter subjects based on naming matches to easily create categories
  const socialSubjects = safeSubjects.filter(s => s.name.toLowerCase().includes("social"));
  const mathsSubjects  = safeSubjects.filter(s => s.name.toLowerCase().includes("math"));
  const otherSubjects  = safeSubjects.filter(s => !s.name.toLowerCase().includes("social") && !s.name.toLowerCase().includes("math"));

  return (
    <>
      <style>{`
        @keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
        @keyframes runeRotate { from { transform: rotate(0) } to { transform: rotate(360deg) } }
        @keyframes borderSpin { 0% { background-position: 0% 50% } 100% { background-position: 200% 50% } }
        @keyframes cardRise { from { opacity: 0; transform: translateY(52px) scale(0.9) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes shimmer { 0%, 100% { transform: translateX(-160%) } 60% { transform: translateX(210%) } }
        @keyframes slashBeam { from { transform: translateX(0) skewX(-14deg) } to { transform: translateX(340%) skewX(-14deg) } }
        @keyframes titleIn { from { opacity: 0; letter-spacing: 0.6em; transform: translateY(-18px) } to { opacity: 1; letter-spacing: 0.28em; transform: translateY(0) } }
        @keyframes subIn { from { opacity: 0; transform: translateY(10px) } to { opacity: 0.7; transform: translateY(0) } }
        @keyframes glow { 0%, 100% { text-shadow: 0 0 40px rgba(204,0,0,0.4), 0 4px 22px #000 } 50% { text-shadow: 0 0 80px rgba(204,0,0,0.9), 0 0 130px rgba(204,0,0,0.22), 0 4px 22px #000 } }
        @keyframes logoFloat { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-5px) } }
        @keyframes twinkle { from { opacity: 0.15 } to { opacity: 0.9 } }
        @keyframes fadePulse { 0%, 100% { opacity: 0.3 } 50% { opacity: 1 } }
        @keyframes xpbeat { 0%, 100% { transform: scale(1) } 50% { transform: scale(1.35) } }
        @keyframes petalFall { 0% { transform: translateY(0) rotate(0deg); opacity: 0.75 } 100% { transform: translateY(110vh) rotate(420deg); opacity: 0 } }
        @keyframes lanternSway { 0%, 100% { transform: rotate(-4deg) } 50% { transform: rotate(4deg) } }
        @keyframes scanline { from { top: -3px } to { top: 100% } }
        @keyframes diamondPulse { 0%, 100% { box-shadow: 0 0 14px #cc0000 } 50% { box-shadow: 0 0 30px #cc0000, 0 0 50px rgba(204,0,0,0.4) } }
      `}</style>

      <main
        style={{
          minHeight:  "100vh",
          position:   "relative",
          color:      "#fff",
          fontFamily: "Georgia,serif",
          background: "#000",
          overflowX:  "hidden"
        }}
      >
        <DojoBackground />
        <Particles />

        <div
          style={{
            position:       "fixed",
            top:            0,
            left:           0,
            width:          "100%",
            height:         3,
            background:     "linear-gradient(90deg,transparent,rgba(204,0,0,0.07),transparent)",
            animation:      "scanline 14s linear infinite",
            zIndex:         2,
            pointerEvents:  "none"
          }}
        />

        {/* ── HEADER ── */}
        <header
          style={{
            position:             "sticky",
            top:                  0,
            zIndex:               50,
            background:           "rgba(3,0,5,0.84)",
            backdropFilter:       "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            borderBottom:         "1px solid rgba(204,0,0,0.13)",
            boxShadow:            "0 4px 40px rgba(0,0,0,0.9)"
          }}
        >
          <nav
            style={{
              maxWidth:       1160,
              margin:         "0 auto",
              padding:        "12px 28px",
              display:        "flex",
              justifyContent: "space-between",
              alignItems:     "center"
            }}
          >
            <div
              style={{
                display:    "flex",
                alignItems: "center",
                gap:        14
              }}
            >
              <div
                style={{
                  position:   "relative",
                  width:      48,
                  height:     48,
                  animation:  "logoFloat 4s ease-in-out infinite"
                }}
              >
                <div
                  style={{
                    width:          48,
                    height:         48,
                    borderRadius:   "50%",
                    background:     "linear-gradient(135deg,#cc0000,#660000)",
                    border:         "1px solid rgba(255,60,60,0.42)",
                    boxShadow:      "0 0 26px rgba(204,0,0,0.65),inset 0 0 14px rgba(0,0,0,0.55)",
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    fontWeight:     900,
                    fontSize:       15,
                    color:          "#fff",
                    letterSpacing:  1
                  }}
                >
                  {user?.username?.charAt(0).toUpperCase() || "?"}
                </div>
                <svg
                  style={{
                    position:   "absolute",
                    top:        -8,
                    left:       -8,
                    width:      64,
                    height:     64,
                    animation:  "spin 9s linear infinite"
                  }}
                  viewBox="0 0 64 64"
                >
                  <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(204,0,0,0.42)" strokeWidth="1" strokeDasharray="5 7" />
                  {[0, 90, 180, 270].map(a => {
                    const r = a * Math.PI / 180;
                    return (
                      <polygon
                        key={a}
                        points={`${32 + 27 * Math.cos(r)},${32 + 27 * Math.sin(r) - 5} ${32 + 27 * Math.cos(r) + 3},${32 + 27 * Math.sin(r) + 3} ${32 + 27 * Math.cos(r) - 3},${32 + 27 * Math.sin(r) + 3}`}
                        fill="rgba(204,0,0,0.7)"
                      />
                    );
                  })}
                </svg>
              </div>
              <span
                style={{
                  fontFamily:     "Georgia,serif",
                  fontWeight:     900,
                  fontSize:       20,
                  letterSpacing:  "0.35em",
                  textTransform:  "uppercase",
                  color:          "#e0e0e0",
                  textShadow:     "0 0 18px rgba(204,0,0,0.32)"
                }}
              >
                Leadent
              </span>
            </div>

            <div
              style={{
                display:        "flex",
                alignItems:     "center",
                gap:            12,
                background:     "rgba(12,2,2,0.88)",
                border:         "1px solid rgba(204,0,0,0.18)",
                borderRadius:   100,
                padding:        "8px 20px",
                backdropFilter: "blur(14px)"
              }}
            >
              <div
                style={{
                  display:        "flex",
                  flexDirection:  "column",
                  alignItems:     "flex-end",
                  gap:            4
                }}
              >
                <div style={{ display: "flex", gap: 3 }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      style={{
                        width:        9,
                        height:       9,
                        borderRadius: 2,
                        background:   i <= 2 ? "#cc0000" : "rgba(255,255,255,0.07)",
                        boxShadow:    i <= 2 ? "0 0 8px #cc0000" : "none",
                        transition:   "all 0.3s",
                        animation:    xpPulse && i <= 2 ? "xpbeat 0.5s ease" : "none"
                      }}
                    />
                  ))}
                </div>
                <span
                  style={{
                    fontSize:       8,
                    color:          "#cc0000",
                    fontWeight:     900,
                    letterSpacing:  "0.2em",
                    textTransform:  "uppercase"
                  }}
                >
                  XP {user?.xp || 0} / 1000
                </span>
              </div>

              <div
                style={{
                  width:      1,
                  height:     30,
                  background: "rgba(255,255,255,0.09)"
                }}
              />

              <div>
                <div
                  style={{
                    fontSize:       12,
                    fontWeight:     700,
                    color:          "#e0e0e0",
                    letterSpacing:  "0.12em",
                    textTransform:  "uppercase"
                  }}
                >
                  {user?.username}
                </div>
                <div
                  style={{
                    fontSize:       9,
                    color:          "#cc0000",
                    fontWeight:     900,
                    letterSpacing:  "0.2em",
                    textTransform:  "uppercase"
                  }}
                >
                  Level {user?.level || 1} Ninja
                </div>
              </div>

              <div
                style={{
                  width:      1,
                  height:     30,
                  background: "rgba(255,255,255,0.09)"
                }}
              />

              {/* Memory Profile Link */}
              <Link
                href="/memory-profile"
                style={{
                  fontSize:       10,
                  fontWeight:     900,
                  color:          "#7a7a7a",
                  letterSpacing:  "0.18em",
                  textTransform:  "uppercase",
                  cursor:         "pointer",
                  background:     "none",
                  border:         "none",
                  fontFamily:     "Georgia,serif",
                  transition:     "color 0.2s",
                  textDecoration: "none"
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "#cc0000")}
                onMouseLeave={e => (e.currentTarget.style.color = "#7a7a7a")}
              >
                🧠 Profile
              </Link>

              <div
                style={{
                  width:      1,
                  height:     30,
                  background: "rgba(255,255,255,0.09)"
                }}
              />

              {/* AI Tutor Link */}
              <Link
                href="/chat"
                style={{
                  fontSize:       10,
                  fontWeight:     900,
                  color:          "#7a7a7a",
                  letterSpacing:  "0.18em",
                  textTransform:  "uppercase",
                  cursor:         "pointer",
                  background:     "none",
                  border:         "none",
                  fontFamily:     "Georgia,serif",
                  transition:     "color 0.2s",
                  textDecoration: "none"
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "#cc0000")}
                onMouseLeave={e => (e.currentTarget.style.color = "#7a7a7a")}
              >
                💬 Tutor
              </Link>

              <div
                style={{
                  width:      1,
                  height:     30,
                  background: "rgba(255,255,255,0.09)"
                }}
              />

              <button
                onClick={handleLogout}
                style={{
                  fontSize:       10,
                  fontWeight:     900,
                  color:          "#4a4a4a",
                  letterSpacing:  "0.18em",
                  textTransform:  "uppercase",
                  cursor:         "pointer",
                  background:     "none",
                  border:         "none",
                  fontFamily:     "Georgia,serif",
                  transition:     "color 0.2s"
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "#cc0000")}
                onMouseLeave={e => (e.currentTarget.style.color = "#4a4a4a")}
              >
                Flee
              </button>
            </div>
          </nav>

          <div
            style={{
              position:   "absolute",
              bottom:     0,
              left:       0,
              right:      0,
              height:     1,
              background: "linear-gradient(90deg,transparent,rgba(204,0,0,0.45),transparent)"
            }}
          />
        </header>

        {/* ── HERO ── */}
        <section
          style={{
            position:       "relative",
            zIndex:         10,
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            padding:        "58px 24px 38px",
            textAlign:      "center"
          }}
        >
          <div
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          14,
              width:        "100%",
              maxWidth:     460,
              marginBottom: 18
            }}
          >
            <div
              style={{
                flex:       1,
                height:     1,
                background: "linear-gradient(90deg,transparent,rgba(204,0,0,0.75))"
              }}
            />
            <div
              style={{
                width:        10,
                height:       10,
                background:   "#cc0000",
                borderRadius: 1,
                transform:    "rotate(45deg)",
                animation:    "diamondPulse 2.5s ease-in-out infinite"
              }}
            />
            <div
              style={{
                flex:       1,
                height:     1,
                background: "linear-gradient(90deg,rgba(204,0,0,0.75),transparent)"
              }}
            />
          </div>

          <h1
            style={{
              fontFamily:     "Georgia,serif",
              fontWeight:     900,
              fontSize:       "clamp(2rem,6.5vw,4.5rem)",
              textTransform:  "uppercase",
              letterSpacing:  "0.28em",
              color:          "#fff",
              textShadow:     "0 0 60px rgba(204,0,0,0.45),0 4px 24px rgba(0,0,0,1)",
              animation:      "titleIn 1.2s cubic-bezier(0.22,1,0.36,1) both, glow 5s 1.5s ease-in-out infinite",
              margin:         "0 0 16px",
            }}
          >
            Choose Your Realm
          </h1>

          <p
            style={{
              fontSize:       "0.94rem",
              color:          "rgba(220,190,190,0.7)",
              fontStyle:      "italic",
              letterSpacing:  "0.07em",
              textShadow:     "0 2px 8px rgba(0,0,0,1)",
              animation:      "subIn 1.4s 0.3s both"
            }}
          >
            "Every master was once a beginner. Step into the shadows."
          </p>

          <div
            style={{
              display:    "flex",
              alignItems: "center",
              gap:        14,
              width:      "100%",
              maxWidth:   460,
              marginTop:  18
            }}
          >
            <div
              style={{
                flex:       1,
                height:     1,
                background: "linear-gradient(90deg,transparent,rgba(204,0,0,0.5))"
              }}
            />
            <span
              style={{
                fontSize: 22,
                filter:   "drop-shadow(0 0 12px rgba(204,0,0,0.9))"
              }}
            >
              ⚔️
            </span>
            <div
              style={{
                flex:       1,
                height:     1,
                background: "linear-gradient(90deg,rgba(204,0,0,0.5),transparent)"
              }}
            />
          </div>
        </section>

        {/* ── FLEXBOX SECTIONS ── */}
        <div
          style={{
            position:       "relative",
            zIndex:         10,
            maxWidth:       1160,
            margin:         "0 auto",
            padding:        "0 24px 80px",
            display:        "flex",
            flexDirection:  "column",
            gap:            "60px"
          }}
        >
          {/* SECTION 1: SOCIAL */}
          {socialSubjects.length > 0 && (
            <section>
              <h2
                style={{
                  color:          "#cc0000",
                  fontSize:       "1.5rem",
                  textTransform:  "uppercase",
                  letterSpacing:  "0.2em",
                  marginBottom:   24,
                  borderBottom:   "1px solid rgba(204,0,0,0.3)",
                  paddingBottom:  12,
                  textShadow:     "0 0 10px rgba(204,0,0,0.5)"
                }}
              >
                Realm of Social
              </h2>
              <div
                style={{
                  display:   "flex",
                  flexWrap:  "wrap",
                  gap:       28
                }}
              >
                {socialSubjects.map((s, i) => (
                  <div style={{ flex: "1 1 320px", maxWidth: 400 }} key={s.id}>
                    <RealmCard subject={s} index={i} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SECTION 2: MATHS */}
          {mathsSubjects.length > 0 && (
            <section>
              <h2
                style={{
                  color:          "#cc0000",
                  fontSize:       "1.5rem",
                  textTransform:  "uppercase",
                  letterSpacing:  "0.2em",
                  marginBottom:   24,
                  borderBottom:   "1px solid rgba(204,0,0,0.3)",
                  paddingBottom:  12,
                  textShadow:     "0 0 10px rgba(204,0,0,0.5)"
                }}
              >
                Realm of Maths
              </h2>
              <div
                style={{
                  display:   "flex",
                  flexWrap:  "wrap",
                  gap:       28
                }}
              >
                {mathsSubjects.map((s, i) => (
                  <div style={{ flex: "1 1 320px", maxWidth: 400 }} key={s.id}>
                    <RealmCard subject={s} index={i} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SECTION 3: CODING & OTHERS */}
          {otherSubjects.length > 0 && (
            <section>
              <h2
                style={{
                  color:          "#cc0000",
                  fontSize:       "1.5rem",
                  textTransform:  "uppercase",
                  letterSpacing:  "0.2em",
                  marginBottom:   24,
                  borderBottom:   "1px solid rgba(204,0,0,0.3)",
                  paddingBottom:  12,
                  textShadow:     "0 0 10px rgba(204,0,0,0.5)"
                }}
              >
                Realm of Coding & Disciplines
              </h2>
              <div
                style={{
                  display:   "flex",
                  flexWrap:  "wrap",
                  gap:       28
                }}
              >
                {otherSubjects.map((s, i) => (
                  <div style={{ flex: "1 1 320px", maxWidth: 400 }} key={s.id}>
                    <RealmCard subject={s} index={i} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div
          style={{
            position:       "relative",
            zIndex:         10,
            textAlign:      "center",
            paddingBottom:  28,
            fontSize:       9,
            color:          "#242424",
            letterSpacing:  "0.35em",
            textTransform:  "uppercase"
          }}
        >
          ⚡ Leadent Dojo — Your path to mastery ⚡
        </div>
      </main>
    </>
  );
}