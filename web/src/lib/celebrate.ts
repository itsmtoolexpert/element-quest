import confetti from "canvas-confetti";

const COLORS = ["#FF595E", "#FF924C", "#FFCA3A", "#8AC926", "#2EC4B6", "#1982C4", "#4CC9F0", "#7B61FF", "#F15BB5", "#D883FF"];

/** A burst of confetti from an element on screen (or the middle of the screen). */
export function burst(from?: Element | null, particles = 40) {
  let origin = { x: 0.5, y: 0.5 };
  if (from) {
    const r = from.getBoundingClientRect();
    origin = { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight };
  }
  confetti({ particleCount: particles, spread: 70, startVelocity: 28, origin, colors: COLORS, disableForReducedMotion: true, scalar: 0.9 });
}

/** Confetti falling across the whole screen, for milestones. */
export function rain(amount = 1) {
  const end = Date.now() + 900 * amount;
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.2 }, colors: COLORS, disableForReducedMotion: true });
    confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.2 }, colors: COLORS, disableForReducedMotion: true });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
