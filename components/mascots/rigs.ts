import type { MascotCharacter } from "./types";
import pixiManifest from "../../public/mascots/pixi/manifest.json";
import pixiExpressions from "../../public/mascots/pixi/expressions.json";

export type MascotLayerRole = "body" | "eyes" | "mouth" | "mouth-o" | "rays";

export interface MascotLayer {
  name: string;
  file: string;
  offset: [number, number];
  size: [number, number];
  pivot: [number, number];
  role: MascotLayerRole | "accent-rays";
}

export interface MascotExpressionSet {
  eyes: MascotLayer[];
  mouth?: MascotLayer;
  accent?: MascotLayer;
}

export interface MascotRig {
  character: MascotCharacter;
  canvas: [number, number];
  alphaBBox: [number, number, number, number];
  bodyPivot: [number, number];
  body: MascotLayer;
  eyes: MascotLayer[];
  mouth?: MascotLayer;
  mouthO?: MascotLayer;
  rays: MascotLayer[];
  /** approved expression sets extracted from the 6-panel expression sheet */
  expressions?: Record<string, MascotExpressionSet>;
  limitations: string[];
  /** content hashes per file — appended to asset URLs for cache-busting */
  hashes: Record<string, string>;
}

type Manifest = {
  character: string;
  canvas: number[];
  alpha_bbox: number[];
  body_pivot: number[];
  layers: MascotLayer[];
  hashes?: Record<string, string>;
  limitations: string[];
};

type ExpressionsFile = {
  source: string;
  expressions: Record<string, MascotExpressionSet>;
  hashes?: Record<string, string>;
};

function fromManifest(m: Manifest, expressions?: ExpressionsFile): MascotRig {
  const layers = m.layers;
  const body = {
    name: "body",
    file: "body.png",
    offset: [0, 0],
    size: m.canvas,
    pivot: m.body_pivot,
    role: "body",
  } as MascotLayer;
  return {
    character: m.character as MascotCharacter,
    canvas: m.canvas as [number, number],
    alphaBBox: m.alpha_bbox as [number, number, number, number],
    bodyPivot: m.body_pivot as [number, number],
    body,
    eyes: layers.filter((l) => l.role === "eyes"),
    mouth: layers.find((l) => l.role === "mouth"),
    mouthO: layers.find((l) => l.role === "mouth-o"),
    rays: layers.filter((l) => l.role === "accent-rays"),
    expressions: expressions?.expressions,
    limitations: m.limitations,
    hashes: { ...m.hashes, ...expressions?.hashes },
  };
}

/** Rigs produced by tools/prepare_character.py + tools/extract_expressions.py. Characters without a rig yet render their original art statically. */
export const RIGS: Partial<Record<MascotCharacter, MascotRig>> = {
  pixi: fromManifest(
    pixiManifest as unknown as Manifest,
    pixiExpressions as unknown as ExpressionsFile,
  ),
};

export function getRig(character: MascotCharacter): MascotRig | undefined {
  return RIGS[character];
}
