import questions from "@/data/questions.json";

export const ALL_QUESTIONS = questions;

// Build the list of sections (madda) with question counts, in real order.
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

export function totalQuestions() {
  return questions.length;
}

// --- Deterministic RNG (mulberry32) so option order is STABLE per question.
// This is what lets a short resume-link reconstruct the exact score/review.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(arr, seed) {
  const rand = mulberry32(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Sort questions in their real order: by madda, then by numeric question number.
function orderPool(pool) {
  return [...pool].sort((a, b) => {
    if (a.madda !== b.madda) return a.madda - b.madda;
    return (Number(a.qnum) || 0) - (Number(b.qnum) || 0);
  });
}

// Build a quiz in REAL (sequential) order for a madda (or "all").
// Option positions are deterministic per question id, so the same quiz can be
// rebuilt identically on resume and the answers-string in the link stays valid.
export function buildQuiz(madda) {
  let pool = questions;
  if (madda !== "all") {
    pool = questions.filter((q) => q.madda === Number(madda));
  }
  pool = orderPool(pool);

  return pool.map((q) => {
    const distractors = (q.distractors || []).slice(0, 3);
    // Seed with the id + a constant so the correct answer still moves around
    // between questions, but is fixed for a given question.
    const options = seededShuffle([q.answer, ...distractors], q.id * 2654435761);
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
