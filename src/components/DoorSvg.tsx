export type DoorState =
  | "ready"
  | "soon"
  | "knocking"
  | "valid"
  | "invalid"
  | "risky"
  | "unknown"
  | "error"
  | "limit"
  | "joined";

type Props = {
  state: DoorState;
  label: string;
  /** Plays the arrive and knock intro (hero only). */
  intro?: boolean;
  /** Change this number to replay the plate swing for a new answer. */
  answerId?: number;
  className?: string;
};

const ANSWERS: DoorState[] = ["valid", "invalid", "risky", "unknown", "error", "limit", "joined"];

/**
 * A line-drawn door that stands for the inbox.
 * Every moving part is driven by CSS from data-state (see globals.css),
 * so the door works and reads correctly even without the animation bundle.
 * Decorative: the same information is always given as text next to it.
 */
export function DoorSvg({ state, label, intro = false, answerId = 0, className = "" }: Props) {
  const fontSize = label.length > 12 ? 19 : 22;
  return (
    <div
      className={`door ${className}`}
      data-state={state}
      data-intro={intro ? "true" : undefined}
      data-answer={ANSWERS.includes(state) ? "true" : undefined}
    >
      <svg viewBox="0 0 400 520" aria-hidden="true" focusable="false" className="block h-auto w-full">
        <g className="door-scroll">
          {/* Doorway behind the leaf */}
          <path d="M122 480V184a78 78 0 0 1 156 0v296Z" fill="var(--color-ink-3)" />
          <path className="light" d="M122 480V184a78 78 0 0 1 156 0v296Z" fill="var(--color-signal)" />

          {/* Leaf. leaf-scroll is for the scroll story, leaf is for answers. */}
          <g className="leaf-scroll">
            <g className="leaf">
              <path
                d="M122 480V184a78 78 0 0 1 156 0v296Z"
                fill="var(--color-ink)"
                stroke="var(--color-paper)"
                strokeWidth="2"
              />
              <path d="M146 456V200a54 54 0 0 1 108 0v256Z" fill="none" stroke="var(--color-rule)" strokeWidth="1.5" />
              <rect x="166" y="326" width="68" height="12" rx="6" fill="none" stroke="var(--color-paper)" strokeWidth="2" />
              <circle cx="258" cy="372" r="5.5" fill="var(--color-paper)" />
            </g>
          </g>

          {/* Frame and ground */}
          <path d="M108 480V180a92 92 0 0 1 184 0v300" fill="none" stroke="var(--color-paper)" strokeWidth="2" />
          <path d="M36 480h328" stroke="var(--color-paper)" strokeWidth="2" strokeLinecap="round" />
          <path d="M60 492h280" stroke="var(--color-rule)" strokeWidth="1.5" strokeLinecap="round" />

          {/* Shut: the slot is crossed out */}
          <g className="shut-mark" stroke="var(--color-paper)" strokeWidth="3" strokeLinecap="round">
            <path d="M178 314l44 36M222 314l-44 36" />
          </g>

          {/* No answer: three quiet dots */}
          <g className="dots" fill="var(--color-muted)">
            <circle cx="184" cy="300" r="4" />
            <circle cx="200" cy="300" r="4" />
            <circle cx="216" cy="300" r="4" />
          </g>

          {/* Knock pulses */}
          <g fill="none" stroke="var(--color-paper)" strokeWidth="1.5">
            <circle className="ring ring-1" cx="200" cy="396" r="44" />
            <circle className="ring ring-2" cx="200" cy="396" r="44" />
            <circle className="ring ring-3" cx="200" cy="396" r="44" />
          </g>

          {/* Envelope */}
          <g className="env-move">
            <g className="env-knock">
              <rect x="152" y="366" width="96" height="62" rx="4" fill="var(--color-ink)" stroke="var(--color-paper)" strokeWidth="2" />
              <path d="M154 370l46 33 46-33" fill="none" stroke="var(--color-paper)" strokeWidth="2" strokeLinejoin="round" />
            </g>
          </g>

          {/* The answer plate hangs from a nail */}
          <g className="plate" key={answerId}>
            <circle cx="200" cy="196" r="3.5" fill="var(--color-paper)" />
            <path d="M200 196l-62 30M200 196l62 30" stroke="var(--color-paper)" strokeWidth="1.5" fill="none" />
            <rect className="plate-bg" x="112" y="226" width="176" height="46" rx="23" strokeWidth="2" />
            <text
              className="plate-text"
              x="200"
              y="250"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fontSize}
              fontWeight="650"
              style={{ fontFamily: "inherit" }}
            >
              {label}
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}
