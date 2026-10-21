export type FakeQrProps = {
  /** Sumber pola. Nilai yang sama selalu menghasilkan gambar yang sama. */
  seed: string;
  label: string;
  size?: number;
};

const CELLS = 25;
const FINDER = 7;

function hash(seed: string): () => number {
  let h = 2166136261;
  for (const char of seed) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const inFinder = (x: number, y: number) =>
  (x < FINDER && y < FINDER) || (x >= CELLS - FINDER && y < FINDER) || (x < FINDER && y >= CELLS - FINDER);

/** Mirip QR tetapi BUKAN QR: pola acak deterministik plus tiga penanda sudut. Tidak bisa dipindai. Untuk simulasi saja. */
export function FakeQr({ seed, label, size = 192 }: FakeQrProps) {
  const next = hash(seed);
  const cells: [number, number][] = [];
  for (let y = 0; y < CELLS; y++) {
    for (let x = 0; x < CELLS; x++) {
      if (!inFinder(x, y) && next() > 0.5) cells.push([x, y]);
    }
  }
  const finders: [number, number][] = [
    [0, 0],
    [CELLS - FINDER, 0],
    [0, CELLS - FINDER],
  ];

  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={`-1 -1 ${CELLS + 2} ${CELLS + 2}`}
      shapeRendering="crispEdges"
      className="rounded-lg border bg-card text-foreground"
    >
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />
      ))}
      {finders.map(([x, y]) => (
        <g key={`f-${x}-${y}`}>
          <rect x={x} y={y} width={FINDER} height={FINDER} fill="currentColor" />
          <rect x={x + 1} y={y + 1} width={FINDER - 2} height={FINDER - 2} className="fill-card" />
          <rect x={x + 2} y={y + 2} width={FINDER - 4} height={FINDER - 4} fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}
