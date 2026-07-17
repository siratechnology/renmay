"use client";

import { useMemo, useState } from "react";
import { getSections, buildQuiz } from "@/lib/quiz";

const LETTERS = ["أ", "ب", "ج", "د"];

export default function Home() {
  const sections = useMemo(() => getSections(), []);
  const [view, setView] = useState("setup"); // setup | quiz | result
  const [quiz, setQuiz] = useState([]);
  const [sectionLabel, setSectionLabel] = useState("");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]); // chosen index per question

  function startQuiz(madda, label) {
    const q = buildQuiz(madda);
    setQuiz(q);
    setSectionLabel(label);
    setAnswers(new Array(q.length).fill(-1));
    setCurrent(0);
    setView("quiz");
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }

  function choose(optIndex) {
    if (answers[current] !== -1) return; // already answered
    const next = [...answers];
    next[current] = optIndex;
    setAnswers(next);
  }

  function goNext() {
    if (current < quiz.length - 1) {
      setCurrent(current + 1);
      window.scrollTo(0, 0);
    } else {
      setView("result");
      window.scrollTo(0, 0);
    }
  }

  function goPrev() {
    if (current > 0) {
      setCurrent(current - 1);
      window.scrollTo(0, 0);
    }
  }

  function restart() {
    setView("setup");
    setQuiz([]);
    setAnswers([]);
    setCurrent(0);
    window.scrollTo(0, 0);
  }

  if (view === "setup") {
    return (
      <SetupView sections={sections} onStart={startQuiz} total={quizTotal(sections)} />
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
        onExit={restart}
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

function quizTotal(sections) {
  return sections.reduce((s, x) => s + x.count, 0);
}

/* ---------- Setup ---------- */
function SetupView({ sections, onStart, total }) {
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

      <section className="card panel">
        <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>لە کام ماددە/بەشدا تاقی دەبیتەوە؟</h2>
        <p className="subtitle" style={{ margin: 0 }}>
          کۆی گشتی {total} پرسیار لە {sections.length} ماددەدا
        </p>

        <div className="section-grid">
          <button className="section-card all" onClick={() => onStart("all", "هەموو ماددەکان")}>
            <div>
              <div className="section-title">هەموو پرسیارەکان</div>
              <div className="section-meta">تاقیکردنەوەی گشتی لەسەر هەموو ماددەکان</div>
            </div>
            <span className="pill">{total} پرسیار</span>
          </button>

          {sections.map((s) => (
            <button
              key={s.madda}
              className="section-card"
              onClick={() => onStart(s.madda, s.label)}
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

  const passed = pct >= 50;
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
