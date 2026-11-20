export type MascotCharacter = "pixi" | "guru" | "pelajar" | "admin";

export type MascotState =
  | "idle"
  | "sleeping"
  | "waking"
  | "thinking"
  | "working"
  | "happy"
  | "celebrating"
  | "confused"
  | "error"
  | "success"
  // character-specific flavors (share animations with the base states above)
  | "greeting"
  | "processing"
  | "explaining";

export const LOOPING_STATES: MascotState[] = [
  "idle",
  "sleeping",
  "thinking",
  "working",
  "processing",
  "explaining",
];

/** Base durations (ms) measured against the boxi reference, scaled by `speed`. */
export const STATE_DURATION: Record<MascotState, number> = {
  idle: 3600,
  sleeping: 4500,
  waking: 1400,
  thinking: 3200,
  working: 2800,
  happy: 2400,
  celebrating: 1600,
  confused: 900,
  error: 550,
  success: 900,
  greeting: 1100,
  processing: 3200,
  explaining: 2800,
};

export const STATE_LABEL: Record<MascotState, string> = {
  idle: "Idle",
  sleeping: "Sleeping",
  waking: "Waking",
  thinking: "Thinking",
  working: "Working",
  happy: "Happy",
  celebrating: "Celebrating",
  confused: "Confused",
  error: "Error",
  success: "Success",
  greeting: "Greeting",
  processing: "Processing",
  explaining: "Explaining",
};

export function isLooping(state: MascotState): boolean {
  return LOOPING_STATES.includes(state);
}
