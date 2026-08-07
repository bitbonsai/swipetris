const days = document.getElementById("score-days");

function dateLabel(seed) {
  const text = String(seed);
  const year = text.slice(0, 4);
  const month = Number(text.slice(4, 6));
  const day = Number(text.slice(6, 8));
  const monthName = new Intl.DateTimeFormat(undefined, { month: "short" }).format(new Date(2000, month - 1, 1));
  return `${monthName.toUpperCase()} ${day}, ${year}`;
}

function scoreDay({ seed, leaderboard }) {
  const details = document.createElement("details");
  details.className = "score-day";

  const summary = document.createElement("summary");
  const date = document.createElement("span");
  date.className = "score-date";
  date.textContent = dateLabel(seed);
  const high = document.createElement("b");
  high.className = "score-high";
  high.textContent = leaderboard[0].score.toLocaleString();
  summary.append(date, high);

  const top = document.createElement("div");
  top.className = "score-top";
  const list = document.createElement("ol");
  leaderboard.forEach((row, index) => {
    const item = document.createElement("li");
    const rank = document.createElement("span");
    rank.className = "score-rank";
    rank.textContent = index + 1;
    const name = document.createElement("span");
    name.className = "score-name";
    name.textContent = String(row.name).toUpperCase().slice(0, 5);
    if (row.synthetic) {
      const badge = document.createElement("small");
      badge.className = "cpu-badge";
      badge.textContent = "CPU";
      name.append(badge);
    }
    const points = document.createElement("b");
    points.className = "score-points";
    points.textContent = row.score.toLocaleString();
    item.append(rank, name, points);
    list.append(item);
  });
  top.append(list);
  details.append(summary, top);
  return details;
}

async function loadScores() {
  try {
    const response = await fetch("/api/daily-scores");
    if (!response.ok) throw new Error("request failed");
    const { dailyScores } = await response.json();
    days.replaceChildren();
    if (!dailyScores.length) {
      const empty = document.createElement("p");
      empty.className = "score-empty";
      empty.textContent = "No scores yet. Be the first to put a day on the board.";
      days.append(empty);
      return;
    }
    dailyScores.forEach((day) => days.append(scoreDay(day)));
  } catch {
    days.innerHTML = '<p class="score-empty score-error">The score archive is taking a breather. Try again soon.</p>';
  }
}

loadScores();
