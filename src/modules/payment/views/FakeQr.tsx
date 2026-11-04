/**
 * @file FakeQr.tsx
 * @description Komponen FakeQr - mirip QR code tetapi bukan QR asli.
 * Pola acak deterministik plus tiga penanda sudut untuk simulasi.
 * Tidak dapat dipindai oleh QR reader.
 */

/* ========================================================================== */
/*                                   Types                                    */
/* ========================================================================== */

export type FakeQrProps = {
  /** Sumber pola - nilai yang sama selalu menghasilkan gambar identik */
  readonly seed: string;
  /** Label untuk aksesibilitas */
  readonly label: string;
  /** Ukuran QR dalam pixel (default: 192) */
  readonly size?: number;
};

/* ========================================================================== */
/*                                 Constants                                  */
/* ========================================================================== */

/** Jumlah sel dalam grid QR */
const GRID_CELLS = 25;

/** Ukuran finder pattern di sudut */
const FINDER_SIZE = 7;

/* ========================================================================== */
/*                              Hash Function                                 */
/* ========================================================================== */

/**
 * Membuat fungsi hash deterministik dari seed string.
 * Menggunakan FNV-1a hash algorithm untuk menghasilkan angka pseudo-random.
 */
const createHashGenerator = (seed: string): (() => number) => {
  let hashValue = 2166136261;

  for (const character of seed) {
    hashValue = Math.imul(hashValue ^ character.charCodeAt(0), 16777619);
  }

  return () => {
    hashValue = Math.imul(hashValue ^ (hashValue >>> 15), 2246822507);
    hashValue = Math.imul(hashValue ^ (hashValue >>> 13), 3266489909);
    hashValue ^= hashValue >>> 16;
    return (hashValue >>> 0) / 4294967296;
  };
};

/* ========================================================================== */
/*                             Helper Functions                               */
/* ========================================================================== */

/**
 * Mengecek apakah koordinat berada di dalam area finder pattern.
 * Finder pattern ada di tiga sudut: kiri-atas, kanan-atas, kiri-bawah.
 */
const isInsideFinderArea = (xPos: number, yPos: number): boolean => {
  const inTopLeft = xPos < FINDER_SIZE && yPos < FINDER_SIZE;
  const inTopRight = xPos >= GRID_CELLS - FINDER_SIZE && yPos < FINDER_SIZE;
  const inBottomLeft = xPos < FINDER_SIZE && yPos >= GRID_CELLS - FINDER_SIZE;

  return inTopLeft || inTopRight || inBottomLeft;
};

/**
 * Membuat array koordinat sel yang akan diisi.
 */
const generateCellPositions = (hashFn: () => number): ReadonlyArray<[number, number]> => {
  const positions: Array<[number, number]> = [];

  for (let yPos = 0; yPos < GRID_CELLS; yPos += 1) {
    for (let xPos = 0; xPos < GRID_CELLS; xPos += 1) {
      const shouldFill = !isInsideFinderArea(xPos, yPos) && hashFn() > 0.5;
      if (shouldFill) {
        positions.push([xPos, yPos]);
      }
    }
  }

  return positions;
};

/** Posisi finder pattern di tiga sudut */
const FINDER_POSITIONS: ReadonlyArray<[number, number]> = [
  [0, 0],
  [GRID_CELLS - FINDER_SIZE, 0],
  [0, GRID_CELLS - FINDER_SIZE],
];

/* ========================================================================== */
/*                                Component                                   */
/* ========================================================================== */

/**
 * Komponen FakeQr - menampilkan gambar mirip QR untuk keperluan simulasi.
 * QR ini tidak dapat dipindai karena polanya acak, bukan encoding data asli.
 */
export const FakeQr = ({ seed, label, size = 192 }: FakeQrProps) => {
  const hashGenerator = createHashGenerator(seed);
  const cellPositions = generateCellPositions(hashGenerator);

  const viewBoxSize = GRID_CELLS + 2;
  const viewBoxValue = `-1 -1 ${viewBoxSize} ${viewBoxSize}`;

  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={viewBoxValue}
      shapeRendering="crispEdges"
      className="rounded-lg border bg-card text-foreground"
    >
      {/* Data cells - pola acak */}
      {cellPositions.map(([xPos, yPos]) => (
        <rect key={`cell-${xPos}-${yPos}`} x={xPos} y={yPos} width={1} height={1} fill="currentColor" />
      ))}

      {/* Finder patterns - penanda sudut */}
      {FINDER_POSITIONS.map(([xPos, yPos]) => (
        <g key={`finder-${xPos}-${yPos}`}>
          {/* Outer square */}
          <rect x={xPos} y={yPos} width={FINDER_SIZE} height={FINDER_SIZE} fill="currentColor" />
          {/* Middle square (white) */}
          <rect
            x={xPos + 1}
            y={yPos + 1}
            width={FINDER_SIZE - 2}
            height={FINDER_SIZE - 2}
            className="fill-card"
          />
          {/* Inner square */}
          <rect
            x={xPos + 2}
            y={yPos + 2}
            width={FINDER_SIZE - 4}
            height={FINDER_SIZE - 4}
            fill="currentColor"
          />
        </g>
      ))}
    </svg>
  );
};
