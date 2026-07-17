import questions from "@/data/questions.json";

export const ALL_QUESTIONS = questions;

// Build the list of sections (madda) with question counts.
export function getSections() {
  const map = new Map();
  for (const q of questions) {
    if (!map.has(q.madda)) {
      map.set(q.madda, { madda: q.madda, label: q.maddaLabel, count: 0 });
    }
    map.get(q.madda).count += 1;
  }
  return [...map.values()].sort((a, b) => a.madda - b.madda);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Sample up to `n` distractor answers that differ from the correct one.
function pickDistractors(correct, n) {
  const seen = new Set([correct.trim()]);
  const pool = shuffle(ALL_QUESTIONS);
  const out = [];
  for (const q of pool) {
    const a = q.answer.trim();
    if (seen.has(a)) continue;
    seen.add(a);
    out.push(q.answer);
    if (out.length >= n) break;
  }
  return out;
}

// Build a quiz: pick questions for a madda (or all), attach 4 shuffled options.
export function buildQuiz(madda, limit = 0) {
  let pool = questions;
  if (madda !== "all") {
    pool = questions.filter((q) => q.madda === Number(madda));
  }
  pool = shuffle(pool);
  if (limit > 0) pool = pool.slice(0, limit);

  return pool.map((q) => {
    const distractors = pickDistractors(q.answer, 3);
    const options = shuffle([q.answer, ...distractors]);
    const answerIndex = options.indexOf(q.answer);
    return {
      id: q.id,
      qnum: q.qnum,
      question: q.question,
      source: q.source,
      maddaLabel: q.maddaLabel,
      options,
      answerIndex,
    };
  });
}
