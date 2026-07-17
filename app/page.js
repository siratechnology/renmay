"use client";

import { useEffect, useMemo, useState } from "react";
import { getSections, buildQuiz, totalQuestions } from "@/lib/quiz";

const LETTERS = ["أ", "ب", "ج", "د"];
const STORAGE_KEY = "renmay-progress-v1";

/* ---------- progress encode/decode (kept tiny so it fits in a link) ---------- */
// answers: array of ints (-1 = unanswered). Encoded one char per question.
function encodeAnswers(answers) {
  return answers.map((x) => (x < 0 ? "_" : String(x))).join("");
}
function decodeAnswers(str, len) {
  const out = new Array(len).fill(-1);
  if (!str) return out;
  for (let i = 0; i < len && i < str.length; i++) {
    const c = str[i];
    out[i] = c === "_" ? -1 : Number(c);
  }
  return out;
}
function scoreOf(quiz, answers) {
  let correct = 0;
  let answered = 0;
  for (let i = 0; i < quiz.length; i++) {
    if (answers[i] !== -1) {
      answered++;
      if (answers[i] === quiz[i].answerIndex) correct++;
    }
  }
  return { correct, answered };
}

function readUrlState() {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search);
  const m = p.get("m");
  if (!m) return null;
  return { m, i: Math.max(0, Number(p.get("i")) || 0), a: p.get("a") || "" };
}
function readStoredState() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}
function persist(state) {
  if (typeof window === "undefined") return;
  const p = new URLSearchParams();
  p.set("m", state.m);
  p.set("i", String(state.i));
  p.set("a", state.a);
  const url = `${window.location.pathname}?${p.toString()}`;
  window.history.replaceState(null, "", url);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, ts: Date.now() }));
  } catch {}
}
function clearPersisted() {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", window.location.pathname);
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export default function Home() {
  const sections = useMemo(() => getSections(), []);
  const total = useMemo(() => totalQuestions(), []);
  const [view, setView] = useState("setup"); // setup | quiz | result
  const [madda, setMadda] = useState("all");
  const [quiz, setQuiz] = useState([]);
  const [sectionLabel, setSectionLabel] = useState("");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [saved, setSaved] = useState(null); // resumable state on the setup screen

  // On first load: if a link (or saved progress) exists, offer to resume.
  useEffect(() => {
    const fromUrl = readUrlState();
    const fromStore = readStoredState();
    const st = fromUrl || fromStore;
    if (st && st.m) {
      const q = buildQuiz(st.m);
      if (q.length) {
        setSaved({ ...st, count: q.length });
        if (fromUrl) resume(st, q); // a shared link resumes straight into the quiz
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function labelFor(m) {
    if (m === "all") return "هەموو ماددەکان (بەڕیزبەندی)";
    const s = sections.find((x) => String(x.madda) === String(m));
    return s ? s.label : `ماددە ${m}`;
  }

  function resume(st, prebuilt) {
    const q = prebuilt || buildQuiz(st.m);
    const ans = decodeAnswers(st.a, q.length);
    setMadda(st.m);
    setQuiz(q);
    setSectionLabel(labelFor(st.m));
    setAnswers(ans);
    setCurrent(Math.min(st.i, q.length - 1));
    setView("quiz");
    setSaved(null);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }

  function startQuiz(m) {
    const q = buildQuiz(m);
    const ans = new Array(q.length).fill(-1);
    setMadda(m);
    setQuiz(q);
    setSectionLabel(labelFor(m));
    setAnswers(ans);
    setCurrent(0);
    setView("quiz");
    setSaved(null);
    persist({ m, i: 0, a: encodeAnswers(ans) });
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }

  function choose(optIndex) {
    if (answers[current] !== -1) return; // already answered
    const next = [...answers];
    next[current] = optIndex;
    setAnswers(next);
    persist({ m: madda, i: current, a: encodeAnswers(next) });
  }

  function goNext() {
    if (current < quiz.length - 1) {
      const ni = current + 1;
      setCurrent(ni);
      persist({ m: madda, i: ni, a: encodeAnswers(answers) });
      window.scrollTo(0, 0);
    } else {
      setView("result");
      window.scrollTo(0, 0);
    }
  }

  function goPrev() {
    if (current > 0) {
      const ni = current - 1;
      setCurrent(ni);
      persist({ m: madda, i: ni, a: encodeAnswers(answers) });
      window.scrollTo(0, 0);
    }
  }

  function restart() {
    clearPersisted();
    setView("setup");
    setQuiz([]);
    setAnswers([]);
    setCurrent(0);
    setSaved(null);
    window.scrollTo(0, 0);
  }

  if (view === "setup") {
    return (
      <SetupView
        sections={sections}
        total={total}
        saved={saved}
        onStart={startQuiz}
        onResume={() => resume(saved)}
        onDiscard={() => {
          clearPersisted();
          setSaved(null);
        }}
        savedLabel={saved ? labelFor(saved.m) : ""}
        savedScore={saved ? scoreOf(buildQuiz(saved.m), decodeAnswers(saved.a, saved.count)) : null}
      />
    );
  }
  if (view === "quiz") {
    return (
      <QuizView
        quiz={quiz}
        current={current}
        answers={answers}
        sectionLabel={sectionLabel}
        onChoose={choose}
        onNext={goNext}
        onPrev={goPrev}
        onExit={() => {
          setView("setup");
          window.scrollTo(0, 0);
        }}
      />
    );
  }
  return (
    <ResultView
      quiz={quiz}
      answers={answers}
      sectionLabel={sectionLabel}
      onRestart={restart}
    />
  );
}

/* ---------- Setup ---------- */
function SetupView({ sections, total, saved, onStart, onResume, onDiscard, savedLabel, savedScore }) {
  return (
    <main className="container">
      <header className="app-header">
        <span className="badge">● سیستەمی تاقیکردنەوەی خۆکار</span>
        <h1>تاقیکردنەوەی ڕێنمایی قوتابخانە و پەیمانگە ناحکومییەکان</h1>
        <p className="subtitle">
          ماددە یان بەشێک هەڵبژێرە بۆ ئەوەی تێیدا تاقی بکرێیتەوە. هەر پرسیارێک چوار
          هەڵبژاردەی هەیە، لە کۆتاییدا نمرە و پرسیارە هەڵە و ڕاستەکانت پیشان دەدرێت.
        </p>
      </header>

      {saved && (
        <section className="card resume-card">
          <div>
            <div className="section-title">بەردەوامبوون لەسەر تاقیکردنەوەی پێشوو</div>
            <div className="section-meta">
              {savedLabel} — پرسیاری {Math.min(saved.i + 1, saved.count)} لە {saved.count}
              {savedScore && ` · نمرە: ${savedScore.correct} ڕاست لە ${savedScore.answered} وەڵامدراو`}
            </div>
          </div>
          <div className="resume-actions">
            <button className="btn btn-primary" onClick={onResume}>
              بەردەوامبوون
            </button>
            <button className="btn btn-ghost" onClick={onDiscard}>
              سڕینەوە
            </button>
          </div>
        </section>
      )}

      <section className="card panel">
        <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>لە کام ماددە/بەشدا تاقی دەبیتەوە؟</h2>
        <p className="subtitle" style={{ margin: 0 }}>
          کۆی گشتی {total} پرسیار لە {sections.length} ماددەدا — دەتوانیت لە نیوەڕێدا
          بوەستیت و دواتر لە هەمان بەستەر (لینک) بەردەوام بیت.
        </p>

        <div className="section-grid">
          <button className="section-card all" onClick={() => onStart("all")}>
            <div>
              <div className="section-title">هەموو پرسیارەکان — بەڕیزبەندی</div>
              <div className="section-meta">
                لە پێشەکییەوە تا کۆتا ماددە، بەھەمان ڕیزبەندیی ڕەسەن
              </div>
            </div>
            <span className="pill">{total} پرسیار</span>
          </button>

          {sections.map((s) => (
            <button
              key={s.madda}
              className="section-card"
              onClick={() => onStart(String(s.madda))}
            >
              <span className="pill">{s.count} پرسیار</span>
              <span className="section-title">{s.label}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

/* ---------- Quiz ---------- */
function QuizView({ quiz, current, answers, sectionLabel, onChoose, onNext, onPrev, onExit }) {
  const q = quiz[current];
  const chosen = answers[current];
  const answered = chosen !== -1;
  const pct = Math.round(((current + (answered ? 1 : 0)) / quiz.length) * 100);
  const { correct, answered: answeredCount } = scoreOf(quiz, answers);
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <main className="container">
      <div className="quiz-top">
        <button className="btn btn-ghost" onClick={onExit}>
          ← گەڕانەوە
        </button>
        <span className="q-count">
          پرسیاری {current + 1} لە {quiz.length} — {sectionLabel}
        </span>
      </div>

      <div className="quiz-top" style={{ marginBottom: 8 }}>
        <span className="score-live">
          ڕاست: {correct} لە {answeredCount} وەڵامدراو
        </span>
        <button className="btn btn-ghost btn-sm" onClick={copyLink}>
          {copied ? "کۆپی کرا ✓" : "کۆپیکردنی بەستەری بەردەوامبوون"}
        </button>
      </div>

      <div className="progress">
        <span style={{ width: `${pct}%` }} />
      </div>

      <section className="card panel">
        <div className="quiz-top" style={{ marginBottom: 8 }}>
          <span className="q-source">{q.source}</span>
        </div>
        <h2 className="question-text">{q.question}</h2>

        <div className="options">
          {q.options.map((opt, i) => {
            let cls = "option";
            if (answered) {
              if (i === q.answerIndex) cls += " correct";
              else if (i === chosen) cls += " wrong";
            }
            return (
              <button
                key={i}
                className={cls}
                onClick={() => onChoose(i)}
                disabled={answered}
              >
                <span className="letter">{LETTERS[i]}</span>
                <span>{opt}</span>
                {answered && i === q.answerIndex && <span className="mark">✓</span>}
                {answered && i === chosen && i !== q.answerIndex && (
                  <span className="mark">✗</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="quiz-actions">
          <button className="btn btn-ghost" onClick={onPrev} disabled={current === 0}>
            پرسیاری پێشوو
          </button>
          <button className="btn btn-primary" onClick={onNext} disabled={!answered}>
            {current === quiz.length - 1 ? "بینینی ئەنجام" : "پرسیاری داهاتوو"}
          </button>
        </div>
      </section>
    </main>
  );
}

/* ---------- Result ---------- */
function ResultView({ quiz, answers, sectionLabel, onRestart }) {
  const correct = quiz.reduce(
    (s, q, i) => s + (answers[i] === q.answerIndex ? 1 : 0),
    0
  );
  const total = quiz.length;
  const wrong = total - correct;
  const pct = total ? Math.round((correct / total) * 100) : 0;

  const title = pct >= 90 ? "نایاب! 🎉" : pct >= 70 ? "زۆر باش 👏" : pct >= 50 ? "باش ✅" : "پێویستی بە خوێندنەوەی زیاترە 📚";
  const ringColor = pct >= 70 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)";

  return (
    <main className="container">
      <section className="card result-hero">
        <div
          className="score-ring"
          style={{
            background: `conic-gradient(${ringColor} ${pct * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
          }}
        >
          <div className="score-inner">
            <div className="score-num" style={{ color: ringColor }}>
              {pct}%
            </div>
            <div className="score-of">
              {correct} لە {total}
            </div>
          </div>
        </div>
        <h1 className="result-title">{title}</h1>
        <p className="result-sub">
          ئەنجامی تاقیکردنەوە — {sectionLabel}
        </p>

        <div className="stats">
          <div className="stat ok">
            <b>{correct}</b>
            <span>وەڵامی ڕاست</span>
          </div>
          <div className="stat no">
            <b>{wrong}</b>
            <span>وەڵامی هەڵە</span>
          </div>
          <div className="stat">
            <b>{total}</b>
            <span>کۆی پرسیار</span>
          </div>
        </div>

        <div className="result-actions">
          <button className="btn btn-primary" onClick={onRestart}>
            تاقیکردنەوەی نوێ
          </button>
        </div>
      </section>

      <h2 className="review-title">پێداچوونەوەی وەڵامەکان</h2>
      {quiz.map((q, i) => {
        const ok = answers[i] === q.answerIndex;
        const chosenText = answers[i] === -1 ? "— (بێ وەڵام)" : q.options[answers[i]];
        return (
          <div key={q.id} className={`review-item ${ok ? "ok" : "no"}`}>
            <div className="review-q">
              {i + 1}. {q.question}
            </div>
            {!ok && (
              <div className="review-line">
                <span className="lbl">وەڵامی تۆ:</span>
                <span className="txt-red">{chosenText}</span>
              </div>
            )}
            <div className="review-line">
              <span className="lbl">وەڵامی ڕاست:</span>
              <span className="txt-green">{q.options[q.answerIndex]}</span>
            </div>
            <div className="review-line">
              <span className="lbl">سەرچاوە:</span>
              <span style={{ color: "var(--muted)" }}>{q.source}</span>
            </div>
          </div>
        );
      })}
    </main>
  );
}
