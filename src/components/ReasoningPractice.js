'use client';

import { useState, useEffect, useRef, useCallback } from "react";

const SECTIONS = {
  verbal: {
    label: "Verbal Reasoning",
    color: "#4f46e5",
    lightBg: "#eef2ff",
    borderColor: "#c7d2fe",
    categories: [
      { 
        id: "seating_arrangement", 
        label: "Seating Arrangement", 
        icon: "⊞", 
        desc: "Arrange persons based on given conditions",
        rules: [
          "Draw a diagram (line or circle) before reading clues",
          "Fix one person first, then place others relatively",
          "In circular arrangements, positions are relative not absolute",
          "Re-read each clue after placing every person",
          "Eliminate options that contradict even one clue",
        ]
      },
      { 
        id: "syllogisms", 
        label: "Syllogisms", 
        icon: "∴", 
        desc: "Logical conclusions from given statements",
        rules: [
          "Draw Venn diagrams for All, Some, No statements",
          "'All A is B' does NOT mean 'All B is A'",
          "'Some A is B' means at least one, possibly all",
          "'No A is B' is always reversible: 'No B is A'",
          "A conclusion must be true in ALL possible diagrams",
        ]
      },
      { 
        id: "coding_decoding", 
        label: "Coding & Decoding", 
        icon: "⌘", 
        desc: "Decode patterns and cipher logic",
        rules: [
          "Find the pattern by comparing input and output letters",
          "Check if letters are shifted forward or backward",
          "Look for position-based patterns (1st, 2nd, 3rd letter)",
          "Numbers may replace letters by their alphabet position",
          "Sometimes alternate letters or words are coded differently",
        ]
      },
    ],
  },
  analytical: {
    label: "Analytical Reasoning",
    color: "#0891b2",
    lightBg: "#ecfeff",
    borderColor: "#a5f3fc",
    categories: [
      { 
        id: "clocks", 
        label: "Clocks", 
        icon: "◷", 
        desc: "Angles, hands and time calculations",
        rules: [
          "Hour hand moves 0.5° per minute (30° per hour)",
          "Minute hand moves 6° per minute (360° per hour)",
          "Angle between hands = |30H - 5.5M|",
          "Hands overlap every 65 5/11 minutes",
          "For mirror image: subtract time from 11:60",
        ]
      },
      { 
        id: "calendars", 
        label: "Calendars", 
        icon: "▦", 
        desc: "Days, dates and odd days problems",
        rules: [
          "Ordinary year = 365 days = 52 weeks + 1 odd day",
          "Leap year = 366 days = 52 weeks + 2 odd days",
          "Century year is leap only if divisible by 400",
          "100 years = 5 odd days, 200 = 3, 300 = 1, 400 = 0",
          "Jan 1, 1900 was a Monday — use as reference point",
        ]
      },
      { 
        id: "logical_deduction", 
        label: "Logical Deduction", 
        icon: "⊢", 
        desc: "Draw valid conclusions from premises",
        rules: [
          "Only conclude what is 100% guaranteed by the facts",
          "Do not use outside knowledge — only given statements",
          "Watch for words: all, some, none, always, never, only",
          "A conclusion that is 'likely' or 'possible' is not valid",
          "Negate each option and check if it contradicts the facts",
        ]
      },
    ],
  },
};

const DIFFICULTY = ["Easy", "Medium", "Hard"];

function buildPrompt(catId, difficulty) {
  const hints = {
    seating_arrangement: "Create a seating arrangement puzzle (linear or circular). Describe 4-5 people with clues about positions, then ask who sits at a specific position.",
    syllogisms: "Give exactly 2 statements (All/Some/No format). Provide 4 conclusions labeled A-D and ask which logically follows.",
    coding_decoding: "Create a coding pattern (letter shift, number substitution, or symbol mapping). Show an example encoding then ask to decode/encode a word.",
    clocks: "Create a clock problem about angle between hands, time when hands overlap, or mirror image of a clock.",
    calendars: "Create a calendar problem about finding the day of a week for a given date, odd days calculation, or leap year logic.",
    logical_deduction: "Give a short paragraph of 3-4 facts/conditions and ask which conclusion must be true. All options plausible but only one is strictly deducible.",
  };
  return `You are an aptitude question generator for a student placement prep platform.

Topic: ${catId.replace(/_/g, " ")}
Difficulty: ${difficulty}
Instructions: ${hints[catId] || "Generate a standard question for this topic."}

Return ONLY valid JSON, no markdown, no extra text:
{
  "question": "Full question text including scenario",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "answer": "A",
  "explanation": "Step-by-step explanation (3-4 sentences)",
  "tip": "One key exam tip for this question type"
}

Rules:
- Options must start with A. B. C. D.
- answer field must be exactly one of: A, B, C, D
- Difficulty ${difficulty}: ${difficulty === "Easy" ? "straightforward, fewer conditions" : difficulty === "Medium" ? "moderate, 4-5 conditions, placement level" : "complex multi-step, 6+ conditions, advanced level"}`;
}

export default function ReasoningPractice() {
  const [activeSection, setActiveSection] = useState("verbal");
  const [screen, setScreen] = useState("home");
  const [selectedCat, setSelectedCat] = useState(null);
  const [activeSectionKey, setActiveSectionKey] = useState("verbal");
  const [difficulty, setDifficulty] = useState("Medium");
  const [qCount, setQCount] = useState(5);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(40);
  const [timeTaken, setTimeTaken] = useState([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const revealedRef = useRef(false);

  const maxTime = difficulty === "Easy" ? 40 : difficulty === "Medium" ? 60 : 90;
  const sectionData = SECTIONS[activeSectionKey];

  const fetchQuestion = useCallback(async (catId, diff) => {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: buildPrompt(catId, diff) }],
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const raw = data.content?.find(b => b.type === "text")?.text || "{}";
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  }, []);

  const startQuiz = useCallback(async () => {
    setGenerating(true);
    setGenProgress(0);
    setError("");
    const qs = [];
    try {
      for (let i = 0; i < qCount; i++) {
        const q = await fetchQuestion(selectedCat.id, difficulty);
        qs.push(q);
        setGenProgress(Math.round(((i + 1) / qCount) * 100));
      }
      setQuestions(qs);
      setGenerating(false);
      setCurrent(0);
      setScore(0);
      setAnswers([]);
      setTimeTaken([]);
      setSelected(null);
      setRevealed(false);
      revealedRef.current = false;
      setScreen("quiz");
    } catch (e) {
      setError("Failed to generate questions. Please try again.");
      setGenerating(false);
    }
  }, [selectedCat, difficulty, qCount, fetchQuestion]);

  useEffect(() => {
    if (screen !== "quiz") return;
    revealedRef.current = false;
    setTimeLeft(maxTime);
    startTimeRef.current = Date.now();
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          if (!revealedRef.current) {
            revealedRef.current = true;
            const taken = Math.round((Date.now() - startTimeRef.current) / 1000);
            setSelected(null);
            setRevealed(true);
            setAnswers(a => [...a, { selected: null, correct: false, taken }]);
            setTimeTaken(tt => [...tt, taken]);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [current, screen, maxTime]);

  const handleReveal = (opt) => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    clearInterval(timerRef.current);
    const taken = Math.round((Date.now() - startTimeRef.current) / 1000);
    setSelected(opt);
    setRevealed(true);
    const correct = opt === questions[current]?.answer;
    if (correct) setScore(s => s + 1);
    setAnswers(a => [...a, { selected: opt, correct, taken }]);
    setTimeTaken(t => [...t, taken]);
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) { setScreen("result"); return; }
    setCurrent(c => c + 1);
    setSelected(null);
    setRevealed(false);
    revealedRef.current = false;
  };

  const reset = () => {
    setScreen("home");
    setSelectedCat(null);
    setQuestions([]);
    setAnswers([]);
    setScore(0);
    setTimeTaken([]);
    clearInterval(timerRef.current);
  };

  const openCat = (cat, sKey) => {
    setSelectedCat(cat);
    setActiveSectionKey(sKey);
    setScreen("config");
    setError("");
  };

  const q = questions[current];
  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;
  const avgTime = timeTaken.length ? Math.round(timeTaken.reduce((a, b) => a + b, 0) / timeTaken.length) : 0;
  const timerPct = timeLeft / maxTime;
  const timerColor = timeLeft <= 10 ? "#ef4444" : timeLeft <= 20 ? "#f59e0b" : sectionData?.color;

  const optBorder = (l) => {
    if (!revealed) return selected === l ? sectionData?.color : "#e2e8f0";
    if (l === q?.answer) return "#059669";
    if (l === selected) return "#dc2626";
    return "#e2e8f0";
  };
  const optBg = (l) => {
    if (!revealed) return selected === l ? sectionData?.lightBg : "white";
    if (l === q?.answer) return "#ecfdf5";
    if (l === selected && l !== q?.answer) return "#fef2f2";
    return "white";
  };
  const optTextColor = (l) => {
    if (!revealed) return "#1e293b";
    if (l === q?.answer) return "#065f46";
    if (l === selected && l !== q?.answer) return "#7f1d1d";
    return "#94a3b8";
  };

  const grades = [
    { min: 85, label: "Outstanding", color: "#059669" },
    { min: 70, label: "Excellent", color: "#0891b2" },
    { min: 50, label: "Good", color: "#7c3aed" },
    { min: 30, label: "Average", color: "#d97706" },
    { min: 0, label: "Needs Practice", color: "#dc2626" },
  ];
  const grade = grades.find(g => pct >= g.min);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Georgia',serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;}
        .rbtn{cursor:pointer;border:none;outline:none;transition:all 0.18s;}
        .rbtn:hover{opacity:0.88;transform:translateY(-1px);}
        .rbtn:active{transform:scale(0.97);}
        .cat-card{cursor:pointer;transition:all 0.2s;border-radius:14px;padding:1.1rem 1.2rem;background:white;}
        .cat-card:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,0.09);}
        .opt-row{cursor:pointer;display:flex;align-items:flex-start;gap:12px;width:100%;border-radius:11px;padding:13px 15px;transition:all 0.15s;text-align:left;font-family:inherit;}
        .opt-row:hover:not([disabled]){transform:translateX(3px);}
        .tab-btn{cursor:pointer;padding:9px 22px;border-radius:9px;font-family:'Source Sans 3',sans-serif;font-size:13px;font-weight:500;border:none;transition:all 0.2s;}
        .diff-chip{cursor:pointer;border:none;border-radius:8px;padding:7px 18px;font-family:'Source Sans 3',sans-serif;font-size:13px;font-weight:500;transition:all 0.15s;}
      `}</style>

      {/* ── HOME ── */}
      {screen === "home" && (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
          <div style={{ marginBottom: "1.75rem" }}>
            <span style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "#6366f1", fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600 }}>
              AI Student Platform · Aptitude
            </span>
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(1.8rem,4vw,2.6rem)", fontWeight: 700, color: "#0f172a", margin: "6px 0 8px", lineHeight: 1.15 }}>
              Reasoning Practice
            </h1>
            <p style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 14, color: "#64748b", fontWeight: 300, lineHeight: 1.7, margin: 0 }}>
              AI-generated placement prep questions. Pick a section, choose a topic and start practising.
            </p>
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: "1.5rem", background: "#f1f5f9", borderRadius: 12, padding: 5, width: "fit-content" }}>
            {Object.entries(SECTIONS).map(([key, sec]) => (
              <button key={key} className="tab-btn" onClick={() => setActiveSection(key)}
                style={{ background: activeSection === key ? "white" : "transparent", color: activeSection === key ? sec.color : "#64748b", boxShadow: activeSection === key ? "0 1px 6px rgba(0,0,0,0.07)" : "none", fontWeight: activeSection === key ? 600 : 400 }}>
                {sec.label}
              </button>
            ))}
          </div>

          <div style={{ background: SECTIONS[activeSection].lightBg, border: `1px solid ${SECTIONS[activeSection].borderColor}`, borderRadius: 10, padding: "9px 16px", marginBottom: "1.2rem", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: SECTIONS[activeSection].color }} />
            <span style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 13, color: SECTIONS[activeSection].color, fontWeight: 500 }}>
              {SECTIONS[activeSection].label} — {SECTIONS[activeSection].categories.length} topics
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 12, marginBottom: "2rem" }}>
            {SECTIONS[activeSection].categories.map(cat => (
              <div key={cat.id} className="cat-card" onClick={() => openCat(cat, activeSection)}
                style={{ border: `1.5px solid #e2e8f0` }}>
                <div style={{ width: 44, height: 44, borderRadius: 11, background: SECTIONS[activeSection].lightBg, border: `1px solid ${SECTIONS[activeSection].borderColor}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 20, color: SECTIONS[activeSection].color }}>{cat.icon}</span>
                </div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 600, color: "#0f172a", marginBottom: 5 }}>{cat.label}</div>
                <div style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 12, color: "#94a3b8", fontWeight: 300, lineHeight: 1.55 }}>{cat.desc}</div>
                <div style={{ marginTop: 14, fontFamily: "'Source Sans 3',sans-serif", fontSize: 12, color: SECTIONS[activeSection].color, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                  Start practice →
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: "1.25rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {Object.entries(SECTIONS).map(([key, sec]) => (
              <div key={key}>
                <div style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: sec.color, marginBottom: 10, paddingBottom: 6, borderBottom: `1.5px solid ${sec.borderColor}` }}>
                  {sec.label}
                </div>
                {sec.categories.map(c => (
                  <div key={c.id} onClick={() => openCat(c, key)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 4px", cursor: "pointer", borderBottom: "1px solid #f8fafc" }}>
                    <span style={{ fontSize: 15, color: sec.color, width: 22, textAlign: "center", flexShrink: 0 }}>{c.icon}</span>
                    <span style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 13, color: "#374151" }}>{c.label}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CONFIG ── */}
      {screen === "config" && selectedCat && (
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
          <button className="rbtn" onClick={reset}
            style={{ background: "none", color: "#64748b", fontSize: 13, fontFamily: "'Source Sans 3',sans-serif", display: "flex", alignItems: "center", gap: 5, marginBottom: "1.5rem", cursor: "pointer" }}>
            ← Back
          </button>

          <span style={{ background: sectionData.lightBg, border: `1px solid ${sectionData.borderColor}`, borderRadius: 8, padding: "4px 12px", fontFamily: "'Source Sans 3',sans-serif", fontSize: 10, fontWeight: 700, color: sectionData.color, letterSpacing: 1.5, textTransform: "uppercase", display: "inline-block", marginBottom: 14 }}>
            {sectionData.label}
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: "1.5rem" }}>
            <div style={{ width: 54, height: 54, borderRadius: 14, background: sectionData.lightBg, border: `1.5px solid ${sectionData.borderColor}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 24, color: sectionData.color }}>{selectedCat.icon}</span>
            </div>
            <div>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.6rem", fontWeight: 700, color: "#0f172a", margin: "0 0 3px" }}>{selectedCat.label}</h2>
              <p style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 13, color: "#64748b", margin: 0, fontWeight: 300 }}>{selectedCat.desc}</p>
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 10, fontWeight: 700, color: "#374151", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Difficulty</div>
            <div style={{ display: "flex", gap: 8 }}>
              {DIFFICULTY.map(d => (
                <button key={d} className="diff-chip" onClick={() => setDifficulty(d)}
                  style={{ background: difficulty === d ? sectionData.color : "#f1f5f9", color: difficulty === d ? "white" : "#475569" }}>
                  {d}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 8, fontFamily: "'Source Sans 3',sans-serif", fontSize: 12, color: "#94a3b8", fontWeight: 300 }}>
              {difficulty === "Easy" ? "Straightforward problems — ideal for beginners." : difficulty === "Medium" ? "Placement exam level — moderate complexity." : "Advanced level — complex multi-step reasoning."}
            </div>
          </div>

          <div style={{ marginBottom: "1.75rem" }}>
            <div style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 10, fontWeight: 700, color: "#374151", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
              Questions: <span style={{ color: sectionData.color }}>{qCount}</span>
            </div>
            <input type="range" min={3} max={10} step={1} value={qCount} onChange={e => setQCount(+e.target.value)}
              style={{ width: "100%", accentColor: sectionData.color }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Source Sans 3',sans-serif", fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
              <span>3</span><span>10</span>
            </div>
          </div>

          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", marginBottom: "1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[["⏱", `${maxTime}s / Q`, "Per question"], ["📋", `${qCount} Qs`, "Total"], ["🤖", "AI", "Fresh every time"]].map(([ic, val, lbl]) => (
              <div key={lbl} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, marginBottom: 2 }}>{ic}</div>
                <div style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 12, fontWeight: 600, color: "#334155" }}>{val}</div>
                <div style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 10, color: "#94a3b8" }}>{lbl}</div>
              </div>
            ))}
          </div>
          {selectedCat?.rules && (
  <div style={{ background: "white", border: `1.5px solid ${sectionData.borderColor}`, borderRadius: 14, padding: "1.25rem", marginBottom: "1.5rem" }}>
    <div style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 10, fontWeight: 700, color: sectionData.color, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
      📌 Rules to Remember
    </div>
    {selectedCat.rules.map((rule, i) => (
      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        <span style={{ width: 22, height: 22, borderRadius: "50%", background: sectionData.lightBg, border: `1px solid ${sectionData.borderColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: sectionData.color, flexShrink: 0 }}>{i + 1}</span>
        <span style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{rule}</span>
      </div>
    ))}
  </div>
)}

          {error && <div style={{ color: "#dc2626", fontSize: 13, fontFamily: "'Source Sans 3',sans-serif", marginBottom: 10 }}>{error}</div>}

          {generating ? (
            <div>
              <div style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 13, color: "#64748b", marginBottom: 8 }}>
                Generating questions… {genProgress}%
              </div>
              <div style={{ background: "#e2e8f0", borderRadius: 99, height: 6, overflow: "hidden" }}>
                <div style={{ width: `${genProgress}%`, height: "100%", background: sectionData.color, transition: "width 0.4s", borderRadius: 99 }} />
              </div>
            </div>
          ) : (
            <button className="rbtn" onClick={startQuiz}
              style={{ width: "100%", background: sectionData.color, color: "white", padding: "14px", borderRadius: 12, fontSize: 15, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600 }}>
              Start Practice →
            </button>
          )}
        </div>
      )}

      {/* ── QUIZ ── */}
      {screen === "quiz" && q && (
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "2rem 1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <div style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 10, color: "#94a3b8", letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 }}>
                {sectionData?.label} · {selectedCat?.label}
              </div>
              <div style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 14, color: "#374151", fontWeight: 500 }}>
                Q {current + 1} / {questions.length}
              </div>
            </div>
            <div style={{ position: "relative", width: 58, height: 58 }}>
              <svg width="58" height="58" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="29" cy="29" r="25" fill="none" stroke="#f1f5f9" strokeWidth="5" />
                <circle cx="29" cy="29" r="25" fill="none" stroke={timerColor} strokeWidth="5"
                  strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 25}`}
                  strokeDashoffset={`${2 * Math.PI * 25 * (1 - timerPct)}`}
                  style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }} />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 14, fontWeight: 700, color: timerColor, lineHeight: 1 }}>{timeLeft}</div>
                <div style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 8, color: "#94a3b8" }}>sec</div>
              </div>
            </div>
          </div>

          <div style={{ background: "#e2e8f0", borderRadius: 99, height: 3, marginBottom: "1.5rem", overflow: "hidden" }}>
            <div style={{ width: `${(current / questions.length) * 100}%`, height: "100%", background: sectionData?.color, transition: "width 0.4s" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
            <span style={{ background: sectionData?.lightBg, border: `1px solid ${sectionData?.borderColor}`, borderRadius: 20, padding: "3px 12px", fontFamily: "'Source Sans 3',sans-serif", fontSize: 12, color: sectionData?.color, fontWeight: 600 }}>
              {difficulty}
            </span>
            <span style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 20, padding: "3px 12px", fontFamily: "'Source Sans 3',sans-serif", fontSize: 12, color: "#059669", fontWeight: 600 }}>
              ✓ {score}/{current}
            </span>
          </div>

          <div style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 16, padding: "1.5rem", marginBottom: "1rem", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.05rem", color: "#0f172a", lineHeight: 1.75, fontWeight: 600, whiteSpace: "pre-wrap" }}>
              {q.question}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "1rem" }}>
            {["A", "B", "C", "D"].map(letter => {
              const opt = q.options?.find(o => o.startsWith(letter + "."));
              if (!opt) return null;
              return (
                <button key={letter} className="opt-row" disabled={revealed} onClick={() => handleReveal(letter)}
                  style={{ border: `1.5px solid ${optBorder(letter)}`, background: optBg(letter) }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, fontFamily: "'Source Sans 3',sans-serif",
                    background: revealed ? (letter === q.answer ? "#d1fae5" : letter === selected ? "#fee2e2" : "#f8fafc") : (selected === letter ? sectionData?.lightBg : "#f8fafc"),
                    border: `1.5px solid ${optBorder(letter)}`,
                    color: revealed ? (letter === q.answer ? "#059669" : letter === selected ? "#dc2626" : "#94a3b8") : (selected === letter ? sectionData?.color : "#64748b") }}>
                    {letter}
                  </span>
                  <span style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 14, color: optTextColor(letter), fontWeight: 400, lineHeight: 1.55, flex: 1 }}>
                    {opt.replace(/^[ABCD]\.\s*/, "")}
                  </span>
                  {revealed && letter === q.answer && <span style={{ color: "#059669", fontSize: 16, flexShrink: 0 }}>✓</span>}
                  {revealed && letter === selected && letter !== q.answer && <span style={{ color: "#dc2626", fontSize: 16, flexShrink: 0 }}>✗</span>}
                </button>
              );
            })}
          </div>

          {revealed && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {!selected && (
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px", fontFamily: "'Source Sans 3',sans-serif", fontSize: 13, color: "#92400e" }}>
                  ⏰ Time&apos;s up! Correct answer: <strong>{q.answer}</strong>
                </div>
              )}
              <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#0369a1", textTransform: "uppercase", marginBottom: 7 }}>Step-by-step Solution</div>
                <p style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 13, color: "#075985", lineHeight: 1.75, margin: 0, fontWeight: 300 }}>{q.explanation}</p>
              </div>
              {q.tip && (
                <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 12, padding: "12px 16px" }}>
                  <div style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#7c3aed", textTransform: "uppercase", marginBottom: 5 }}>💡 Exam Tip</div>
                  <p style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 13, color: "#6d28d9", lineHeight: 1.65, margin: 0, fontWeight: 300 }}>{q.tip}</p>
                </div>
              )}
              <button className="rbtn" onClick={handleNext}
                style={{ width: "100%", background: sectionData?.color, color: "white", padding: "13px", borderRadius: 12, fontSize: 14, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600 }}>
                {current + 1 >= questions.length ? "View Results →" : "Next Question →"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── RESULT ── */}
      {screen === "result" && (
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
          <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
            <div style={{ fontSize: 46, marginBottom: 8 }}>
              {pct >= 85 ? "🌟" : pct >= 70 ? "🎯" : pct >= 50 ? "👍" : pct >= 30 ? "📚" : "💪"}
            </div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "2rem", fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>Session Complete!</h2>
            <div style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 13, color: "#64748b", fontWeight: 300 }}>
              {sectionData?.label} · {selectedCat?.label} · {difficulty}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.75rem" }}>
            <div style={{ position: "relative", width: 150, height: 150 }}>
              <svg width="150" height="150" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="75" cy="75" r="64" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                <circle cx="75" cy="75" r="64" fill="none" stroke={grade?.color} strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 64}`}
                  strokeDashoffset={`${2 * Math.PI * 64 * (1 - pct / 100)}`} />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "2.2rem", fontWeight: 700, color: "#0f172a" }}>{pct}%</div>
                <div style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 12, color: grade?.color, fontWeight: 600 }}>{grade?.label}</div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: "1.5rem" }}>
            {[
              { l: "Correct", v: score, c: "#059669", bg: "#ecfdf5" },
              { l: "Wrong", v: questions.length - score, c: "#dc2626", bg: "#fef2f2" },
              { l: "Skipped", v: answers.filter(a => !a.selected).length, c: "#d97706", bg: "#fffbeb" },
              { l: "Avg Time", v: `${avgTime}s`, c: "#0891b2", bg: "#f0f9ff" },
            ].map(s => (
              <div key={s.l} style={{ background: s.bg, borderRadius: 12, padding: "14px 6px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.5rem", fontWeight: 700, color: s.c }}>{s.v}</div>
                <div style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 10, color: "#64748b", marginTop: 2, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.l}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: "1.25rem", marginBottom: "1.25rem" }}>
            <div style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 10, fontWeight: 700, color: "#374151", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Answer Review</div>
            {answers.map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, marginBottom: 5, background: a.correct ? "#f0fdf4" : !a.selected ? "#fffbeb" : "#fef2f2" }}>
                <span style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 11, color: "#94a3b8", width: 24, flexShrink: 0 }}>Q{i + 1}</span>
                <span style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 12, color: "#374151", flex: 1, lineHeight: 1.4 }}>
                  {questions[i]?.question?.slice(0, 60)}{questions[i]?.question?.length > 60 ? "…" : ""}
                </span>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{a.correct ? "✅" : !a.selected ? "⏭" : "❌"}</span>
                <span style={{ fontFamily: "'Source Sans 3',sans-serif", fontSize: 11, color: "#94a3b8", width: 28, textAlign: "right", flexShrink: 0 }}>{a.taken}s</span>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button className="rbtn" onClick={() => { setScreen("config"); setError(""); }}
              style={{ background: sectionData?.color, color: "white", padding: "13px", borderRadius: 12, fontSize: 14, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600 }}>
              Retry This Topic
            </button>
            <button className="rbtn" onClick={reset}
              style={{ background: "white", color: "#374151", padding: "13px", borderRadius: 12, fontSize: 14, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 500, border: "1.5px solid #e2e8f0" }}>
              All Topics
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
