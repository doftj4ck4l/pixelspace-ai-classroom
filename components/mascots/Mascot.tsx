"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import { getRig, type MascotLayer } from "./rigs";
import "./mascots.css";
import { MascotExpression } from "./MascotExpression";
import {
  STATE_DURATION,
  type MascotCharacter,
  type MascotState,
} from "./types";
import { useMascotState } from "./useMascotState";
import { useMascotAnimationSettings } from "./MascotAnimationProvider";

export interface MascotProps {
  character: MascotCharacter;
  state?: MascotState;
  /** rendered width in px (height follows the artwork aspect) */
  size?: number;
  /** replay one-shot animations instead of returning to idle */
  loop?: boolean;
  /** playback rate multiplier (0.25 – 2) */
  speed?: number;
  className?: string;
  /** show the soft ground shadow */
  shadow?: boolean;
  onAnimationComplete?: (state: MascotState) => void;
}

function layerStyle(
  layer: MascotLayer,
  canvas: [number, number],
): React.CSSProperties {
  const [cw, ch] = canvas;
  const [ox, oy] = layer.offset;
  const [w] = layer.size;
  const [px, py] = layer.pivot;
  return {
    left: `${(ox / cw) * 100}%`,
    top: `${(oy / ch) * 100}%`,
    width: `${(w / cw) * 100}%`,
    ["--m-origin" as string]: `${((px - ox) / layer.size[0]) * 100}% ${((py - oy) / layer.size[1]) * 100}%`,
  };
}

const FX_BY_STATE: Partial<Record<MascotState, number>> = {
  confused: 1,
  happy: 4,
  greeting: 4,
  success: 3,
  celebrating: 12,
};

const CONFETTI_COLORS = ["#efb206", "#228786", "#3a2312", "#79b9b2", "#f5a623"];

function MascotFx({ state, size }: { state: MascotState; size: number }) {
  const count = FX_BY_STATE[state] ?? 0;
  const items = useMemo(() => {
    if (!count) return [];
    return Array.from({ length: count }, (_, i) => i);
  }, [count]);

  if (!count) return null;
  const u = (n: number) => `${(n * size) / 240}px`;

  return (
    <div className="mascot-fx" aria-hidden>
      {state === "confused" && (
        <span
          className="m-q"
          style={{ left: "74%", top: "2%", fontSize: u(30) }}
        >
          ?
        </span>
      )}

      {state === "happy" && (
        <>
          {[0, 1, 2].map((i) => (
            <span
              key={`n${i}`}
              className="m-note"
              style={{
                left: `${[20, 80, 26][i]}%`,
                top: `${[34, 22, 12][i]}%`,
                fontSize: u(26),
                color: ["#228786", "#efb206", "#3a2312"][i],
                ["--m-delay" as string]: `${i * 480}ms`,
                ["--m-color" as string]: ["#228786", "#efb206", "#3a2312"][i],
              }}
            >
              {i === 1 ? "♫" : "♪"}
            </span>
          ))}
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="m-sparkle"
              style={{
                left: `${[62, 78, 50, 88][i]}%`,
                top: `${[16, 8, 30, 22][i]}%`,
                fontSize: u(20),
                ["--m-delay" as string]: `${300 + i * 200}ms`,
              }}
            >
              ✦
            </span>
          ))}
        </>
      )}

      {(state === "greeting" || state === "success") &&
        items.map((i) => (
          <span
            key={i}
            className="m-sparkle"
            style={{
              left: `${[62, 78, 50, 88][i % 4]}%`,
              top: `${[16, 8, 30, 22][i % 4]}%`,
              fontSize: u(20),
              ["--m-delay" as string]: `${i * 130}ms`,
            }}
          >
            ✦
          </span>
        ))}

      {state === "success" && (
        <span
          className="m-check"
          style={{
            left: "76%",
            top: "4%",
            width: u(34),
            height: u(34),
            fontSize: u(20),
          }}
        >
          ✓
        </span>
      )}

      {state === "celebrating" &&
        items.map((i) => {
          const angle = (i / items.length) * Math.PI * 2;
          return (
            <span
              key={i}
              className="m-confetti"
              style={{
                left: "50%",
                top: "52%",
                ["--m-dx" as string]: `${Math.cos(angle) * 55}%`,
                ["--m-dy" as string]: `${-40 - Math.abs(Math.sin(angle)) * 70}%`,
                ["--m-rot" as string]: `${180 + i * 47}deg`,
                ["--m-delay" as string]: `${(i % 4) * 140 + Math.floor(i / 4) * 90}ms`,
                ["--m-color" as string]:
                  CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                ["--m-cw" as string]: u(6 + (i % 3) * 2),
                ["--m-ch" as string]: u(9 + (i % 2) * 4),
              }}
            />
          );
        })}
    </div>
  );
}

const MemoLayer = memo(function MemoLayer({
  rig,
  layer,
  className,
}: {
  rig: NonNullable<ReturnType<typeof getRig>>;
  layer: MascotLayer;
  className?: string;
}) {
  const hash = rig.hashes[layer.file] ?? "";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/mascots/${rig.character}/${layer.file}${hash ? `?v=${hash}` : ""}`}
      alt=""
      draggable={false}
      className={`mascot-layer ${layer.name} ${className ?? ""}`}
      style={layerStyle(layer, rig.canvas)}
    />
  );
});

export function Mascot({
  character,
  state: stateProp,
  size = 240,
  loop = false,
  speed: speedProp,
  className,
  shadow = true,
  onAnimationComplete,
}: MascotProps) {
  const settings = useMascotAnimationSettings();
  const speed = speedProp ?? settings.speed;
  const paused = settings.paused;
  const reduced = settings.reducedMotion;
  const rig = getRig(character);

  const { state, go, nonce } = useMascotState(stateProp ?? "idle", {
    returnToIdle: !loop,
    speed,
    paused,
    onAnimationComplete,
  });

  // external (declarative) control: reacting only to prop changes
  const lastExternal = useRef<MascotState | null>(null);
  useEffect(() => {
    if (stateProp && stateProp !== lastExternal.current) {
      lastExternal.current = stateProp;
      if (stateProp !== state) go(stateProp);
    } else if (stateProp) {
      lastExternal.current = stateProp;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateProp]);

  if (!rig) {
    // Character not yet rig-prepared (Phase E+): show the untouched original art.
    const [w, h] = [1312, 1199];
    return (
      <div
        className={className}
        style={{ width: size, height: (size * h) / w }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/mascots/${character}/original.png`}
          alt={`${character} (animation rig pending)`}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    );
  }

  const [cw, chh] = rig.canvas;
  const expression = MascotExpression({ state, paused, speed });
  const dur = STATE_DURATION[state];

  const classes = [
    "mascot",
    `rig-${rig.character}`,
    paused ? "mascot-paused" : "",
    reduced ? "mascot-reduced" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      key={nonce}
      data-state={state}
      data-face={expression.face}
      data-mouth={expression.mouth}
      data-rays={expression.rays}
      data-expr={expression.expression ?? undefined}
      className={classes}
      style={{
        width: size,
        height: (size * chh) / cw,
        ["--m-speed" as string]: speed,
        // design-space unit: 1px of the original 1312px artwork, scaled to render size
        ["--m-u" as string]: `${size / cw}px`,
      }}
      role="img"
      aria-label={`Animated mascot ${character} — ${state}`}
    >
      <div
        className="mascot-rig"
        style={{ ["--m-body-origin" as string]: "50% 94%" }}
      >
        <MemoLayer rig={rig} layer={rig.body} />
        {rig.eyes.map((l, i) => (
          <MemoLayer
            key={l.name}
            rig={rig}
            layer={l}
            className={`mascot-eye mascot-eye-${i % 2}`}
          />
        ))}
        {rig.mouth && (
          <MemoLayer rig={rig} layer={rig.mouth} className="mascot-mouth" />
        )}
        {rig.mouthO && (
          <MemoLayer rig={rig} layer={rig.mouthO} className="mascot-mouth-o" />
        )}
        {rig.rays.map((l, i) => (
          <MemoLayer
            key={l.name}
            rig={rig}
            layer={l}
            className={`mascot-ray mascot-ray-${i + 1}`}
          />
        ))}
        {rig.expressions &&
          Object.entries(rig.expressions).map(([key, expr]) => (
            <div
              key={key}
              className={`mascot-expr-group mascot-expr-${key}`}
              aria-hidden
            >
              {expr.eyes.map((l, i) => (
                <MemoLayer
                  key={l.name}
                  rig={rig}
                  layer={l}
                  className={`mascot-expr-layer mascot-expr-eye-${i}`}
                />
              ))}
              {expr.mouth && (
                <MemoLayer
                  rig={rig}
                  layer={expr.mouth}
                  className="mascot-expr-layer mascot-expr-mouth"
                />
              )}
              {expr.accent && (
                <MemoLayer
                  rig={rig}
                  layer={expr.accent}
                  className="mascot-expr-layer mascot-expr-accent"
                />
              )}
            </div>
          ))}
        {!reduced && <MascotFx state={state} size={size} />}
      </div>
      {shadow && (
        <div
          className="mascot-shadow"
          style={{
            bottom: `${(-2 / chh) * 100}%`,
            width: `${(460 / cw) * 100}%`,
            height: `${(52 / chh) * 100}%`,
            ["--m-dur" as string]: `${dur}ms`,
          }}
        />
      )}
    </div>
  );
}
