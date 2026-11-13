// Draws the dial for the mock-ups. In the app this is the <Dial> component (docs/DESIGN-SYSTEM.md).
// One tick per ball of the innings, starting at 12 o'clock and running clockwise.
//   data-balls   total balls in the innings (120 for a T20)
//   data-now     balls bowled so far
//   data-missed  ball numbers of moments the fan missed (comma separated)
//   data-seen    ball numbers of moments the fan saw
for (const el of document.querySelectorAll(".dial[data-balls]")) {
  const n = +el.dataset.balls, now = +el.dataset.now;
  const list = (k) => (el.dataset[k] || "").split(",").filter(Boolean).map(Number);
  const missed = list("missed"), seen = list("seen");
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const R = 100, parts = [];
  const pt = (i, r) => {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2;
    return [(R + r * Math.cos(a)).toFixed(2), (R + r * Math.sin(a)).toFixed(2)];
  };
  for (let i = 0; i < n; i++) {
    const ball = i + 1, isMissed = missed.includes(ball), isSeen = seen.includes(ball);
    const mark = isMissed || isSeen;
    const [x1, y1] = pt(i, mark ? 86 : 93), [x2, y2] = pt(i, 98);
    const stroke = isMissed ? css("--pulse") : ball <= now ? css("--chalk") : css("--rule-strong");
    const op = isMissed || isSeen ? 1 : ball <= now ? 0.55 : 1;
    parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-opacity="${op}" stroke-width="${mark ? 1.1 : 0.6}"/>`);
  }
  if (now > 0 && now < n) {
    const [cx, cy] = pt(now - 0.5, 98);
    parts.push(`<circle cx="${cx}" cy="${cy}" r="2.6" fill="${css("--pulse")}"/>`);
  }
  el.insertAdjacentHTML("afterbegin", `<svg viewBox="0 0 200 200" aria-hidden="true">${parts.join("")}</svg>`);
}
