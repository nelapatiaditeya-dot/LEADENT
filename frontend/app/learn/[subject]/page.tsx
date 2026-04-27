"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Topic {
  id: number;
  name: string;
  type: string;
  completed: boolean;
  locked: boolean;
  accuracy: number | null;
  attempts: number;
  has_text: boolean;
  has_video: boolean;
  level: number;
}

interface TopicDetail {
  id: number;
  name: string;
  subject: string;
  type: string;
  completed: boolean;
  accuracy: number | null;
  level: number;
  text_content: string;
  video_filename: string;
  has_video: boolean;
}

export default function LearnPage({ params }: { params: Promise<{ subject: string }> }) {
  const resolvedParams = use(params);
  const subject = decodeURIComponent(resolvedParams.subject);
  const router = useRouter();

  const [topics, setTopics] = useState<Topic[]>([]);
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [topicDetail, setTopicDetail] = useState<TopicDetail | null>(null);
  const [learningMode, setLearningMode] = useState<"text" | "video">("text");
  const [understood, setUnderstood] = useState(false);
  const [loading, setLoading] = useState(true);

  const [showQuiz, setShowQuiz] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState("");
  const [quizResult, setQuizResult] = useState<{ correct: boolean; explanation: string } | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [hintsUsedCount, setHintsUsedCount] = useState(0);

  // AI Tutor State
  const [showAiTutor, setShowAiTutor] = useState(false);
  const [tutorMessages, setTutorMessages] = useState<{role: string; content: string}[]>([]);
  const [tutorInput, setTutorInput] = useState("");
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorSessionId, setTutorSessionId] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetch(`${API_URL}/api/topics/${encodeURIComponent(subject)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setTopics(data);
        const firstUnlocked = data.find((t: Topic) => !t.locked);
        if (firstUnlocked) fetchTopicDetail(firstUnlocked.id);
        setLoading(false);
      })
      .catch(() => router.push("/dashboard"));
  }, [subject, router]);

  const fetchTopicDetail = (topicId: number) => {
    const token = localStorage.getItem("token")!;
    setQuizStarted(false); setQuizFinished(false); setQuizQuestions([]);
    setQuizIndex(0); setQuizScore(0); setQuizAnswer(""); setQuizResult(null);
    setUnderstood(false); setLearningMode("text");

    fetch(`${API_URL}/api/topic/${topicId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setTopicDetail(data));
  };

  const selectTopic = (topic: Topic) => {
    if (topic.locked) return;
    setCurrentTopic(topic);
    fetchTopicDetail(topic.id);
  };

  const handleUnderstood = () => setUnderstood(true);

  const handleNotUnderstood = () => {
    if (topicDetail?.has_video) setLearningMode("video");
    else alert("The ancient archives lack a video for this technique.");
  };

  // AI Tutor Functions
  const startTutorSession = async () => {
    const token = localStorage.getItem("token")!;
    if (!topicDetail) return;

    try {
      const res = await fetch(`${API_URL}/api/chat/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          topic_id: topicDetail.id,
          topic_name: topicDetail.name,
          subject: topicDetail.subject
        })
      });
      const data = await res.json();
      setTutorSessionId(data.session_id);
      setTutorMessages([{
        role: "assistant",
        content: `Hi! I'm your personal tutor for "${topicDetail.name}". I can help explain concepts with examples, answer questions, or guide you through the topic step by step. What would you like to learn?`
      }]);
    } catch (err) {
      console.error("Failed to start tutor session:", err);
    }
  };

  const sendTutorMessage = async () => {
    if (!tutorInput.trim() || !tutorSessionId) return;

    const userMessage = tutorInput.trim();
    setTutorInput("");
    setTutorMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setTutorLoading(true);

    const token = localStorage.getItem("token")!;
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          session_id: tutorSessionId,
          content: userMessage,
          topic_id: topicDetail?.id,
          topic_name: topicDetail?.name
        })
      });
      const data = await res.json();
      setTutorMessages(prev => [...prev, { role: "assistant", content: data.message }]);
    } catch (err) {
      console.error("Failed to send message:", err);
      setTutorMessages(prev => [...prev, { role: "assistant", content: "I'm having trouble connecting. Please try again." }]);
    }
    setTutorLoading(false);
  };

  const handleQuiz = () => {
    if (!topicDetail) return;
    const token = localStorage.getItem("token")!;
    const topicId = topicDetail.id;

    const startTime = Date.now();
    setSessionStartTime(startTime);
    setGeneratingQuestions(true);
    setShowQuiz(true);
    setQuizQuestions([]);
    setQuizIndex(0);
    setQuizScore(0);
    setQuizAnswer("");
    setQuizResult(null);
    setHintsUsedCount(0);

    fetch(`${API_URL}/generate?topic_id=${topicId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Generated questions:", data);
        if (data.questions && data.questions.length > 0) {
          setQuizQuestions(data.questions);
          setQuizStarted(true);
          setQuestionStartTime(Date.now());
          setGeneratingQuestions(false);
        } else {
          setShowQuiz(false);
          setGeneratingQuestions(false);
          alert("Failed to forge trial. Try again.");
        }
      })
      .catch(() => {
        setShowQuiz(false);
        setQuizStarted(false);
        setGeneratingQuestions(false);
        alert("Failed to summon the trial. Try again.");
      });
  };

  const submitQuizAnswer = (selectedOption: string) => {
    const timeTaken = Date.now() - questionStartTime;
    const currentQ = quizQuestions[quizIndex];
    const correct = selectedOption === currentQ.correct_answer;
    setQuizAnswer(selectedOption);
    setQuizResult({ correct, explanation: currentQ.explanation });

    // Store detailed answer info
    const answerDetail = {
      question_id: currentQ.id,
      question_text: currentQ.question_text,
      selected_answer: selectedOption,
      correct_answer: currentQ.correct_answer,
      is_correct: correct,
      time_taken_ms: timeTaken,
      hint_used: hintsUsedCount > 0,
      attempt_number: 1,
      concept: currentQ.concept || topicDetail?.name || "general",
      subject: subject
    };

    // Store in a temporary array that we'll submit at the end
    if (!currentQ.answerDetail) {
      (currentQ as any).answerDetail = answerDetail;
    }

    if (correct) setQuizScore((prev) => prev + 1);
  };

  const nextQuestion = () => {
    if (quizIndex < quizQuestions.length - 1) {
      setQuizIndex((prev) => prev + 1);
      setQuizAnswer("");
      setQuizResult(null);
      setQuestionStartTime(Date.now());
      setHintsUsedCount(0);
    } else {
      const score = Math.round((quizScore / quizQuestions.length) * 100);
      setFinalScore(score);
      setQuizFinished(true);
      saveProgress(score);
    }
  };

  const saveProgress = (accuracy: number) => {
    if (!topicDetail) return;
    const token = localStorage.getItem("token")!;

    // Collect all answer details
    const answers = quizQuestions
      .map((q) => (q as any).answerDetail)
      .filter(Boolean);

    // Submit detailed quiz results
    fetch(`${API_URL}/api/quiz/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        topic_id: topicDetail.id,
        session_start_ms: sessionStartTime,
        answers: answers
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Quiz submitted:", data);
      })
      .catch((err) => {
        console.error("Failed to submit quiz:", err);
      });

    // Update topic progress
    fetch(`${API_URL}/api/topic/${topicDetail.id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ accuracy, attempts: 1 }),
    }).then(() => {
        return fetch(`${API_URL}/api/topics/${encodeURIComponent(subject)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }).then((res) => res.json())
      .then((data) => {
        setTopics(data);
        if (topicDetail) {
          const updated = data.find((t: Topic) => t.id === topicDetail.id);
          if (updated) setCurrentTopic(updated);
          setTopicDetail((prev) => prev ? { ...prev, completed: accuracy >= 70, accuracy } : null);
        }
      });
  };

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-red-700 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-red-500 text-xs uppercase tracking-widest font-bold">Forging path...</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-black text-white font-sans">

      {/* Top Banner */}
      <header className="sticky top-0 z-50 border-b-2 border-red-900 bg-[#8b0000] shadow-[0_4px_20px_rgba(139,0,0,0.5)]">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-xs font-bold uppercase tracking-widest text-[#ebdcb9] hover:text-white transition-colors flex items-center gap-2">
            <span className="text-lg">◄</span> Retreat to Map
          </Link>
          <div className="text-xl font-serif tracking-[0.2em] uppercase drop-shadow-md text-white">
            {subject} Scroll
          </div>
          <button
            onClick={() => { setShowAiTutor(true); startTutorSession(); }}
            className="text-xs font-bold uppercase tracking-widest text-[#ebdcb9] hover:text-white transition-colors flex items-center gap-2"
          >
            🤝 AI Tutor <span className="text-lg">►</span>
          </button>
        </nav>
      </header>

      <section className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 flex flex-col lg:flex-row gap-8">

        {/* QUEST MAP (Left Side) */}
        <div className="lg:w-1/3 bg-[#0d0d0d] border-2 border-red-900/50 p-6 relative overflow-hidden flex flex-col shadow-[0_0_30px_rgba(139,0,0,0.2)]">
          <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-center text-red-500 mb-8 border-b-2 border-red-900/50 pb-4">
            Path of Mastery
          </h2>

          {/* Scrollable Map Area */}
          <div className="flex-1 overflow-y-auto relative px-4 pb-20">
            {/* Glowing Path Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-red-600 via-red-800 to-red-600/30 -translate-x-1/2 z-0 shadow-[0_0_15px_rgba(220,38,38,0.4)]" />

            <div className="flex flex-col gap-16 relative z-10 pt-4">
              {topics.map((topic, index) => {
                const isActive = topic.id === currentTopic?.id;
                const isLeft = index % 2 === 0;

                return (
                  <div key={topic.id} className={`flex w-full ${isLeft ? 'justify-start' : 'justify-end'}`}>
                    <div className="w-[85%] relative flex items-center flex-col">

                      {/* Branching Line from center to node */}
                      <div className={`absolute top-1/2 w-1/2 h-0.5 bg-gradient-to-r from-red-700 to-red-500 -z-10 ${isLeft ? 'left-1/2' : 'right-1/2'}`} />

                      {/* The Node */}
                      <button
                        onClick={() => selectTopic(topic)}
                        disabled={topic.locked}
                        className={`w-16 h-16 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-300 shadow-lg ${
                          topic.locked
                            ? "border-neutral-700 bg-neutral-900 text-neutral-600 cursor-not-allowed"
                            : isActive
                              ? "border-red-500 bg-red-700 text-white shadow-[0_0_25px_rgba(220,38,38,0.6)] scale-110"
                              : topic.completed
                                ? "border-green-600 bg-green-900/60 text-green-300"
                                : "border-red-700 bg-red-900/40 text-red-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                        }`}
                      >
                        <span className="font-black text-2xl">{topic.locked ? "🔒" : topic.level}</span>
                        {topic.completed && <span className="text-sm text-green-400 font-bold">★</span>}
                      </button>

                      {/* Node Label */}
                      <div className={`mt-3 text-center w-full px-3 py-2 text-[10px] font-black uppercase tracking-wider border-2 shadow-lg ${
                        isActive
                          ? "bg-red-700 border-red-500 text-white"
                          : topic.locked
                            ? "bg-neutral-900 border-neutral-700 text-neutral-600"
                            : "bg-[#1a1a1a] border-red-900/50 text-neutral-300"
                      }`}>
                        {topic.name}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* DOJO / CONTENT AREA (Right Side) */}
        <div className="lg:w-2/3 flex flex-col gap-6">
          {topicDetail && !showQuiz && (
            <div className="bg-[#0d0d0d] border-2 border-red-900/50 p-8 relative shadow-[0_0_40px_rgba(139,0,0,0.15)]">

              {/* Top decorative accents */}
              <div className="absolute top-0 left-0 w-1/3 h-1 bg-gradient-to-r from-red-600 to-transparent" />
              <div className="absolute top-0 right-0 w-8 h-1 bg-red-600 rotate-45 origin-right translate-x-4 -translate-y-2" />

              <div className="border-b-2 border-red-900/50 pb-6 mb-6 flex justify-between items-end">
                <div>
                  <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] mb-1">Stage {topicDetail.level} : {topicDetail.type}</div>
                  <h1 className="text-3xl font-serif uppercase tracking-wider text-white">{topicDetail.name}</h1>
                </div>
                {topicDetail.accuracy !== null && (
                  <div className="text-right">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-red-700">Power Level</div>
                    <div className="text-4xl font-black text-red-500">{Math.round(topicDetail.accuracy)}%</div>
                  </div>
                )}
              </div>

              {!understood && (
                <div className="flex gap-3 mb-6 flex-wrap">
                  <button
                    onClick={() => setLearningMode("text")}
                    className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest border-2 transition-all shadow-lg ${
                      learningMode === "text"
                        ? "bg-red-700 border-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                        : "bg-transparent border-neutral-600 text-neutral-400 hover:border-red-700 hover:text-red-400"
                    }`}
                  >
                    Ancient Texts
                  </button>
                  <button
                    onClick={() => setLearningMode("video")}
                    disabled={!topicDetail.has_video}
                    className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest border-2 transition-all shadow-lg ${
                      learningMode === "video"
                        ? "bg-red-700 border-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                        : !topicDetail.has_video
                          ? "bg-transparent border-neutral-800 text-neutral-600 opacity-50 cursor-not-allowed"
                          : "bg-transparent border-neutral-600 text-neutral-400 hover:border-red-700 hover:text-red-400"
                    }`}
                  >
                    Visions
                  </button>
                  <button
                    onClick={() => {
                      setShowAiTutor(true);
                      startTutorSession();
                    }}
                    className="px-6 py-3 text-[10px] font-black uppercase tracking-widest border-2 border-red-700 bg-red-900/40 text-red-300 hover:bg-red-700 hover:text-white transition-all shadow-lg"
                  >
                    🤝 AI Tutor
                  </button>
                </div>
              )}

              {/* The Text / Video Content */}
              {!understood && (
                <div className="bg-[#111] border-2 border-neutral-800 p-6 min-h-[300px] shadow-inner">
                  {learningMode === "text" ? (
                    <div className="text-sm leading-loose text-neutral-200 whitespace-pre-wrap">
                      {topicDetail.text_content || "The scrolls are empty..."}
                    </div>
                  ) : (
                    <div className="border-2 border-neutral-800 bg-black w-full aspect-video flex items-center justify-center shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]">
                      {topicDetail.video_filename ? (
                        <video
                          src={`${API_URL}/api/content/${topicDetail.subject}/${topicDetail.video_filename}`}
                          controls
                          className="w-full h-full"
                        />
                      ) : (
                        <span className="text-white/50 font-bold uppercase text-sm tracking-widest">No vision available</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              {!understood ? (
                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                  <button
                    onClick={handleNotUnderstood}
                    className="flex-1 py-4 border-2 border-neutral-600 bg-transparent font-black uppercase tracking-widest text-neutral-300 hover:border-red-700 hover:text-red-400 transition-all text-xs shadow-lg"
                  >
                    Seek Guidance
                  </button>
                  <button
                    onClick={handleUnderstood}
                    className="flex-1 py-4 bg-red-700 border-2 border-red-500 font-black uppercase tracking-widest text-white hover:bg-red-600 transition-all text-xs shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                  >
                    I Have Mastered This
                  </button>
                </div>
              ) : !showQuiz && (
                <div className="text-center py-16 bg-[#0d0d0d] border-2 border-red-900/50 text-white shadow-[0_0_30px_rgba(139,0,0,0.2)]">
                  <div className="text-6xl mb-6">⚔️</div>
                  <h3 className="text-2xl font-black uppercase tracking-widest mb-4 text-red-500">Trial by Combat</h3>
                  <p className="mb-8 font-bold text-neutral-500 text-xs uppercase tracking-wider">Prove your mastery to unseal the next technique.</p>
                  <button
                    onClick={handleQuiz}
                    className="px-12 py-4 border-2 border-red-600 bg-red-800 font-black text-sm uppercase tracking-widest text-white hover:bg-red-700 transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                  >
                    Begin Combat
                  </button>
                </div>
              )}
            </div>
          )}

          {/* COMBAT ARENA (Quiz Interface) */}
          {showQuiz && (
            <div className="bg-[#0d0d0d] border-2 border-red-900/50 p-8 text-white min-h-[500px] flex flex-col relative overflow-hidden shadow-[0_0_40px_rgba(139,0,0,0.2)]">

              {generatingQuestions && (
                <div className="m-auto text-center">
                  <div className="w-14 h-14 border-4 border-red-700 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                  <h3 className="text-2xl font-black uppercase tracking-widest text-red-500">Forging Trial...</h3>
                </div>
              )}

              {quizStarted && !quizFinished && quizQuestions.length > 0 && !generatingQuestions && (
                <div className="flex-1 flex flex-col">

                  {/* Combat Stats */}
                  <div className="flex justify-between items-center border-b-2 border-red-900/50 pb-4 mb-8">
                    <div className="font-black uppercase tracking-widest text-red-500 text-sm">
                      Strike {quizIndex + 1} / {quizQuestions.length}
                    </div>
                    <div className="font-black uppercase tracking-widest bg-red-700 px-4 py-1 text-white text-xs shadow-[0_0_10px_rgba(220,38,38,0.4)]">
                      Hits: {quizScore}
                    </div>
                  </div>

                  <h4 className="text-xl font-medium leading-relaxed mb-8 text-neutral-100">
                    {quizQuestions[quizIndex].question_text}
                  </h4>

                  {quizQuestions[quizIndex].hint && (
                    <div className="border-l-4 border-yellow-500 pl-4 mb-8 text-yellow-400 font-medium italic text-sm bg-yellow-900/10 py-2">
                      "Master's Whisper: {quizQuestions[quizIndex].hint}"
                    </div>
                  )}

                  {!quizResult ? (
                    <div className="mt-auto">
                      {quizQuestions[quizIndex].hint && (
                        <button
                          onClick={() => setHintsUsedCount((prev) => prev + 1)}
                          className="mb-4 w-full py-3 border-2 border-yellow-600/50 text-yellow-400 font-bold uppercase tracking-widest hover:bg-yellow-600/20 transition-all text-xs"
                        >
                          Use Hint (+1)
                        </button>
                      )}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        {Object.entries(quizQuestions[quizIndex].options || {}).map(([key, value]) => (
                          <button
                            key={key}
                            onClick={() => submitQuizAnswer(key)}
                            disabled={!!quizAnswer}
                            className={`p-5 border-2 font-bold text-sm transition-all shadow-lg ${
                              quizAnswer === key
                                ? "bg-red-700 border-red-400 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                                : "bg-[#1a1a1a] border-neutral-600 text-neutral-200 hover:border-red-600 hover:text-white"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            <span className="font-black mr-2 text-red-400">{key}:</span>
                            {value as string}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-auto">
                      <div className={`p-6 border-2 mb-6 shadow-lg ${
                        quizResult.correct
                          ? "bg-green-900/30 border-green-600"
                          : "bg-red-900/30 border-red-700"
                      }`}>
                        <div className={`text-2xl font-black uppercase tracking-widest mb-3 ${
                          quizResult.correct ? "text-green-400" : "text-red-400"
                        }`}>
                          {quizResult.correct ? "Critical Hit!" : "Blocked!"}
                        </div>
                        <p className="text-neutral-200 font-medium leading-relaxed text-sm">
                          {quizResult.explanation}
                        </p>
                      </div>
                      <button
                        onClick={nextQuestion}
                        className="w-full py-4 border-2 border-red-600 bg-red-800 font-black uppercase tracking-widest text-white hover:bg-red-700 transition-all text-xs shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                      >
                        {quizIndex < quizQuestions.length - 1 ? "Next Strike" : "End Combat"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Victory / Defeat Screen */}
              {quizFinished && (
                <div className="m-auto text-center w-full">
                  <h3 className={`text-5xl font-black uppercase tracking-widest mb-6 drop-shadow-lg ${
                    finalScore >= 70 ? "text-yellow-400" : "text-red-500"
                  }`}>
                    {finalScore >= 70 ? "Flawless Victory" : "Defeat"}
                  </h3>

                  <div className="text-6xl font-black mb-8 text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                    {finalScore}%
                  </div>

                  <p className="text-sm font-medium mb-12 text-neutral-400">
                    {finalScore >= 70
                      ? "You have proven your worth. The next scroll has been unsealed."
                      : "Your technique is flawed. Return to the scrolls and meditate on your failures."}
                  </p>

                  <div className="flex flex-col gap-4">
                    <button
                      onClick={() => { setShowQuiz(false); setUnderstood(false); }}
                      className="w-full py-4 border-2 border-neutral-600 bg-transparent font-black uppercase tracking-widest text-neutral-300 hover:border-red-700 hover:text-red-400 transition-all text-xs"
                    >
                      Return to Scrolls
                    </button>
                    {finalScore >= 70 && (
                      <Link
                        href="/dashboard"
                        className="w-full block py-4 border-2 border-red-600 bg-red-800 font-black uppercase tracking-widest text-white hover:bg-red-700 transition-all text-xs text-center shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                      >
                        Return to Map
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* AI Tutor Slide-in Panel */}
      {showAiTutor && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAiTutor(false)} />

          {/* Tutor Panel */}
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-[#0a0a0a] border-l-2 border-red-900/50 shadow-[-10px_0_40px_rgba(0,0,0,0.7)] flex flex-col">
            {/* Header */}
            <div className="bg-red-800 text-white p-5 flex justify-between items-center shadow-[0_4px_20px_rgba(139,0,0,0.4)]">
              <div>
                <h3 className="text-lg font-black uppercase tracking-widest">🤝 AI Tutor</h3>
                <p className="text-xs text-red-200 mt-1">{topicDetail?.name}</p>
              </div>
              <button
                onClick={() => setShowAiTutor(false)}
                className="text-3xl font-bold text-red-200 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {tutorMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] p-4 rounded-lg border-2 ${
                    msg.role === "user"
                      ? "bg-red-800/50 border-red-600 text-red-100"
                      : "bg-[#1a1a1a] border-red-900/50 text-neutral-200"
                  }`}>
                    <div className="text-[10px] font-black mb-2 opacity-70 uppercase tracking-wider">
                      {msg.role === "user" ? "You" : "Tutor"}
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</div>
                  </div>
                </div>
              ))}
              {tutorLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#1a1a1a] border-2 border-red-900/50 p-4 rounded-lg">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Prompts */}
            <div className="p-3 border-t-2 border-red-900/50 flex gap-2 flex-wrap">
              {["Explain with example", "I don't understand", "Give me simpler explanation", "What is key point?"].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => { setTutorInput(prompt); }}
                  className="px-3 py-2 text-[10px] bg-[#1a1a1a] border border-red-900/50 text-red-300 rounded-full hover:bg-red-900/30 hover:border-red-700 transition-all font-bold"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t-2 border-red-900/50 flex gap-2">
              <input
                type="text"
                value={tutorInput}
                onChange={(e) => setTutorInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendTutorMessage()}
                placeholder="Ask me anything about this topic..."
                className="flex-1 px-4 py-3 bg-[#1a1a1a] border-2 border-red-900/50 text-white rounded-lg text-sm focus:border-red-600 focus:outline-none placeholder:text-neutral-500"
              />
              <button
                onClick={sendTutorMessage}
                disabled={tutorLoading || !tutorInput.trim()}
                className="px-6 py-3 bg-red-700 border-2 border-red-500 text-white font-black uppercase tracking-widest rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs shadow-[0_0_10px_rgba(220,38,38,0.3)]"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}