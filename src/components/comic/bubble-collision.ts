// Bubble collision resolver — pure client-side utility
// Works in percentage-space relative to the comic page container.

interface BubbleRect {
  top: number;   // % from top of container
  left: number;  // % from left of container
  w: number;     // width in %
  h: number;     // height in %
}

function rectsOverlap(a: BubbleRect, b: BubbleRect, padding = 1.5): boolean {
  return (
    a.left < b.left + b.w + padding &&
    a.left + a.w + padding > b.left &&
    a.top  < b.top  + b.h + padding &&
    a.top  + a.h  + padding > b.top
  );
}

/**
 * Given initial placements (in % coords), nudge overlapping bubbles so they
 * no longer collide. Later bubbles are moved first downward, then to the
 * opposite horizontal side if needed.
 */
export function resolveCollisions(
  placements: Array<{ top: number; left: number; w: number; h: number }>,
): Array<{ top: number; left: number }> {
  if (placements.length === 0) return [];

  const rects: BubbleRect[] = placements.map(p => ({ ...p }));

  for (let i = 1; i < rects.length; i++) {
    for (let j = 0; j < i; j++) {
      let attempts = 0;

      while (rectsOverlap(rects[i], rects[j]) && attempts < 30) {
        const overlapH = (rects[j].top + rects[j].h + 1.5) - rects[i].top;

        if (rects[i].top + overlapH + rects[i].h < 92) {
          // Nudge downward
          rects[i].top = Math.min(88, rects[i].top + overlapH);
        } else {
          // No room below — flip to opposite horizontal side
          const isLeft = rects[i].left < 50;
          rects[i].left = isLeft ? 100 - rects[i].w - 2 : 2;
          // Also reset top to near the conflicting bubble's top
          rects[i].top = rects[j].top;
        }

        attempts++;
      }
    }
  }

  return rects.map(r => ({ top: r.top, left: r.left }));
}
