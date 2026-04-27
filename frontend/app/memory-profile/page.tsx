"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface MemoryProfile {
  overall_accuracy: number;
  total_questions_attempted: number;
  total_correct: number;
  concepts_weak: WeakConcept[];
  concepts_strong: StrongConcept[];
  recent_mistakes: Mistake[];
  topics_to_review: TopicToReview[];
  recent_sessions: Session[];
}

interface WeakConcept {
  concept: string;
  accuracy: number;
  attempts: number;
  avg_time_ms: number;
}

interface StrongConcept {
  concept: string;
  accuracy: number;
  attempts: number;
}

interface Mistake {
  concept: string;
  question: string;
  wrong_answer: string;
  correct_answer: string;
  mistake_type: string;
  frequency: number;
}

interface TopicToReview {
  id: number;
  name: string;
  subject: string;
  accuracy: number;
}

interface Session {
  topic_id: number;
  accuracy: number;
  questions: number;
  duration_ms: number;
  ended_at: string | null;
}

interface Analytics {
  total_questions_attempted: number;
  average_accuracy: number;
  average_time_ms: number;
  total_sessions: number;
  topics_completed: number;
  total_topics: number;
  completion_percentage: number;
  mistake_distribution: Record<string, number>;
}

export default function MemoryProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<MemoryProfile | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "mistakes" | "sessions">("overview");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    Promise.all([
      fetch(`${API_URL}/api/performance/memory-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${API_URL}/api/performance/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(([res1, res2]) => Promise.all([res1.json(), res2.json()]))
      .then(([profileData, analyticsData]) => {
        setProfile(profileData);
        setAnalytics(analyticsData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load memory profile:", err);
        setLoading(false);
      });
  }, [router]);

  const getMistakeTypeColor = (type: string) => {
    switch (type) {
      case "careless":
        return "bg-yellow-600/50 border-yellow-500";
      case "misunderstanding":
        return "bg-red-600/50 border-red-500";
      case "time_pressure":
        return "bg-blue-600/50 border-blue-500";
      default:
        return "bg-neutral-600/50 border-neutral-500";
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-700 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-red-500 text-xs uppercase tracking-widest font-bold">Loading profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white font-sans">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b-2 border-red-900 bg-[#8b0000] shadow-[0_4px_20px_rgba(139,0,0,0.5)]">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-xs font-bold uppercase tracking-widest text-[#ebdcb9] hover:text-white transition-colors flex items-center gap-2">
            <span className="text-lg">◄</span> Back to Map
          </Link>
          <div className="text-xl font-serif tracking-[0.2em] uppercase drop-shadow-md text-white">
            Memory Profile
          </div>
          <div className="w-24" />
        </nav>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {/* Hero Stats */}
        <div className="bg-[#0d0d0d] border-2 border-red-900/50 p-8 mb-8 shadow-[0_0_30px_rgba(139,0,0,0.2)]">
          <h1 className="text-2xl font-serif uppercase tracking-widest text-center mb-8 text-red-500">Your Journey Stats</h1>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#1a1a1a] p-6 text-center border-2 border-red-900/50 shadow-[0_0_15px_rgba(139,0,0,0.2)]">
              <div className="text-4xl font-black text-yellow-400 mb-2">
                {profile?.overall_accuracy?.toFixed(0) || 0}%
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Overall Power</div>
            </div>

            <div className="bg-[#1a1a1a] p-6 text-center border-2 border-red-900/50 shadow-[0_0_15px_rgba(139,0,0,0.2)]">
              <div className="text-4xl font-black text-red-500 mb-2">
                {analytics?.total_questions_attempted || 0}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Questions Faced</div>
            </div>

            <div className="bg-[#1a1a1a] p-6 text-center border-2 border-red-900/50 shadow-[0_0_15px_rgba(139,0,0,0.2)]">
              <div className="text-4xl font-black text-green-500 mb-2">
                {analytics?.topics_completed || 0}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Realms Conquered</div>
            </div>

            <div className="bg-[#1a1a1a] p-6 text-center border-2 border-red-900/50 shadow-[0_0_15px_rgba(139,0,0,0.2)]">
              <div className="text-4xl font-black text-blue-400 mb-2">
                {analytics?.average_time_ms ? formatTime(analytics.average_time_ms) : "0ms"}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Avg Response</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-6 py-3 border-2 font-bold uppercase tracking-widest transition-all text-xs shadow-lg ${
              activeTab === "overview"
                ? "bg-red-700 border-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                : "bg-transparent border-red-900/50 text-neutral-400 hover:border-red-700 hover:text-red-400"
            }`}
          >
            Concepts
          </button>
          <button
            onClick={() => setActiveTab("mistakes")}
            className={`px-6 py-3 border-2 font-bold uppercase tracking-widest transition-all text-xs shadow-lg ${
              activeTab === "mistakes"
                ? "bg-red-700 border-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                : "bg-transparent border-red-900/50 text-neutral-400 hover:border-red-700 hover:text-red-400"
            }`}
          >
            Mistakes ({profile?.recent_mistakes?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("sessions")}
            className={`px-6 py-3 border-2 font-bold uppercase tracking-widest transition-all text-xs shadow-lg ${
              activeTab === "sessions"
                ? "bg-red-700 border-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                : "bg-transparent border-red-900/50 text-neutral-400 hover:border-red-700 hover:text-red-400"
            }`}
          >
            Sessions ({analytics?.total_sessions || 0})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Weak Areas */}
            <div className="bg-[#0d0d0d] border-2 border-red-900/50 p-6 shadow-[0_0_30px_rgba(139,0,0,0.15)]">
              <h2 className="text-lg font-bold uppercase tracking-widest text-center border-b-2 border-red-900/50 pb-4 mb-6 text-red-400">
                ⚠️ Areas Needing Focus
              </h2>

              {profile?.concepts_weak && profile.concepts_weak.length > 0 ? (
                <div className="space-y-4">
                  {profile.concepts_weak.map((concept, idx) => (
                    <div key={idx} className="bg-[#1a1a1a] p-4 border-2 border-red-900/30 text-neutral-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-sm uppercase">{concept.concept}</span>
                        <span className="font-black text-xl text-red-500">{concept.accuracy}%</span>
                      </div>
                      <div className="flex justify-between text-xs text-neutral-500 mb-2">
                        <span>{concept.attempts} attempts</span>
                        <span>Avg: {formatTime(concept.avg_time_ms)}</span>
                      </div>
                      <div className="h-1.5 bg-[#0a0a0a] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-700 to-red-400"
                          style={{ width: `${concept.accuracy}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-500 font-bold text-sm">
                  No weak concepts yet. Keep practicing!
                </div>
              )}
            </div>

            {/* Strong Areas */}
            <div className="bg-[#0d0d0d] border-2 border-green-900/50 p-6 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
              <h2 className="text-lg font-bold uppercase tracking-widest text-center border-b-2 border-green-900/50 pb-4 mb-6 text-green-400">
                ✨ Mastered Concepts
              </h2>

              {profile?.concepts_strong && profile.concepts_strong.length > 0 ? (
                <div className="space-y-4">
                  {profile.concepts_strong.map((concept, idx) => (
                    <div key={idx} className="bg-[#1a1a1a] p-4 border-2 border-green-900/30 text-neutral-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-sm uppercase">{concept.concept}</span>
                        <span className="font-black text-xl text-green-400">{concept.accuracy}%</span>
                      </div>
                      <div className="flex justify-between text-xs text-neutral-500 mb-2">
                        <span>{concept.attempts} attempts</span>
                        <span className="text-green-400">★ Mastered</span>
                      </div>
                      <div className="h-1.5 bg-[#0a0a0a] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-600 to-green-400"
                          style={{ width: `${concept.accuracy}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-500 font-bold text-sm">
                  No mastered concepts yet. Complete more trials!
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "mistakes" && (
          <div className="bg-[#0d0d0d] border-2 border-red-900/50 p-6 shadow-[0_0_30px_rgba(139,0,0,0.15)]">
            <h2 className="text-lg font-bold uppercase tracking-widest text-center border-b-2 border-red-900/50 pb-4 mb-6 text-red-400">
              Recent Mistakes
            </h2>

            {profile?.recent_mistakes && profile.recent_mistakes.length > 0 ? (
              <div className="space-y-4">
                {profile.recent_mistakes.map((mistake, idx) => (
                  <div key={idx} className="bg-[#1a1a1a] p-4 border-2 border-red-900/30 text-neutral-200">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-red-500">{mistake.concept}</span>
                        <h4 className="font-medium text-sm mt-1 text-neutral-300">{mistake.question}</h4>
                      </div>
                      <span className={`px-3 py-1 text-[10px] font-black uppercase border-2 ${getMistakeTypeColor(mistake.mistake_type)}`}>
                        {mistake.mistake_type}
                      </span>
                    </div>

                    <div className="flex gap-6 text-xs">
                      <div>
                        <span className="text-neutral-500">Your answer: </span>
                        <span className="font-bold text-red-400">{mistake.wrong_answer}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500">Correct: </span>
                        <span className="font-bold text-green-400">{mistake.correct_answer}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500">Times: </span>
                        <span className="font-bold">{mistake.frequency}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500 font-bold text-sm">
                No mistakes recorded yet!
              </div>
            )}
          </div>
        )}

        {activeTab === "sessions" && (
          <div className="space-y-6">
            {/* Mistake Distribution */}
            {analytics?.mistake_distribution && Object.keys(analytics.mistake_distribution).length > 0 && (
              <div className="bg-[#0d0d0d] border-2 border-red-900/50 p-6 shadow-[0_0_30px_rgba(139,0,0,0.15)]">
                <h2 className="text-lg font-bold uppercase tracking-widest mb-4 text-red-400">Mistake Types Distribution</h2>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(analytics.mistake_distribution).map(([type, count]) => (
                    <div key={type} className={`px-4 py-2 border-2 font-bold text-xs uppercase ${getMistakeTypeColor(type)} text-white`}>
                      {type}: {count}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Sessions */}
            <div className="bg-[#0d0d0d] border-2 border-red-900/50 p-6 shadow-[0_0_30px_rgba(139,0,0,0.15)]">
              <h2 className="text-lg font-bold uppercase tracking-widest text-center border-b-2 border-red-900/50 pb-4 mb-6 text-red-400">
                Recent Trials
              </h2>

              {profile?.recent_sessions && profile.recent_sessions.length > 0 ? (
                <div className="space-y-4">
                  {profile.recent_sessions.map((session, idx) => (
                    <div key={idx} className="bg-[#1a1a1a] p-4 border-2 border-red-900/30 text-neutral-200 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-sm">Topic #{session.topic_id}</span>
                        <div className="text-xs text-neutral-500 mt-1">
                          {session.questions} questions • {formatTime(session.duration_ms)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-black ${session.accuracy >= 70 ? "text-green-400" : "text-red-400"}`}>
                          {session.accuracy}%
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          {session.ended_at ? new Date(session.ended_at).toLocaleDateString() : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-500 font-bold text-sm">
                  No sessions recorded yet. Start learning!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Topics to Review */}
        {profile?.topics_to_review && profile.topics_to_review.length > 0 && (
          <div className="mt-8 bg-[#0d0d0d] border-2 border-red-900/50 p-6 shadow-[0_0_30px_rgba(139,0,0,0.2)]">
            <h2 className="text-lg font-bold uppercase tracking-widest text-center mb-6 text-red-400">
              Topics Needing Review
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {profile.topics_to_review.map((topic) => (
                <Link
                  key={topic.id}
                  href={`/learn/${encodeURIComponent(topic.subject)}`}
                  className="bg-[#1a1a1a] border-2 border-red-900/50 p-4 text-center hover:bg-red-900/20 hover:border-red-700 transition-all"
                >
                  <div className="font-bold text-sm text-white">{topic.name}</div>
                  <div className="text-xs text-red-400 mt-1">{topic.subject} • {topic.accuracy}%</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}