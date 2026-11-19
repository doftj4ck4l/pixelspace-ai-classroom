"use client";

/** Content shapes stored on local docs and artifacts. */

export type FlashcardItem = { front: string; back: string };

export type SlideOutlineItem = { title: string; subtitle: string };

export type GeneratedContent =
  | { kind: "flashcards"; cards: FlashcardItem[] }
  | { kind: "slides"; slides: SlideOutlineItem[] };

export type GenerationSource = { title: string; url: string };
export type GenerationArtifact = { name: string };
