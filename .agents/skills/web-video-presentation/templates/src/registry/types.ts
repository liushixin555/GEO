import type { ComponentType } from "react";

export interface ChapterStepProps {
  step: number;
}

export type Narration = string;

export interface ChapterDef {
  id: string;
  title: string;
  narrations: Narration[];
  Component: ComponentType<ChapterStepProps>;
}
