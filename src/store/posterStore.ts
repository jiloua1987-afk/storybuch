/**
 * posterStore.ts
 * Zustand store für das Poster-Produkt.
 * Komplett getrennt vom bookStore (Comic-Buch).
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type PosterComicStyle = "action" | "emotional" | "humor";
export type PosterOrientation = "portrait" | "landscape";
export type PosterPhotoMode = "family" | "individual" | "none";

export interface PosterCharacter {
  id: string;
  name: string;
  visual_anchor?: string;
  inPhoto?: boolean;
}

export interface PosterPanel {
  nummer: number;
  szene: string;
  dialogs?: Array<{ speaker: string; text: string }>;
  dialog?: string;
  speaker?: string;
  bubble_type?: "speech" | "caption" | "thought";
}

export interface PosterPanelPosition {
  nummer: number;
  bubbleIndex: number;
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface PosterProject {
  id: string;
  title: string;
  moment: string;               // Der eine Moment (z.B. "Scharfe Suppe im Restaurant")
  category: string;
  comicStyle: PosterComicStyle;
  orientation: PosterOrientation;
  language: "de" | "en" | "fr" | "es";
  photoMode: PosterPhotoMode;
  characters: PosterCharacter[];
  referenceImages: string[];
  referenceImageUrls: { label: string; url: string }[];
  // Generated
  imageUrl?: string;
  panels?: PosterPanel[];
  panelPositions?: PosterPanelPosition[];
  extraBubbles?: Array<{ id: number; top: number; left: number; dialog: string; speaker: string }>;
  hiddenBubbles?: string[];
  status: "draft" | "generating" | "preview" | "ordered";
  createdAt: string;
}

interface PosterStore {
  currentStep: number;
  project: PosterProject | null;

  setStep: (step: number) => void;
  setProject: (project: PosterProject) => void;
  updateProject: (partial: Partial<PosterProject>) => void;
  resetProject: () => void;
}

export const usePosterStore = create<PosterStore>()(
  persist(
    (set) => ({
      currentStep: 0,
      project: null,

      setStep: (step) => set({ currentStep: step }),

      setProject: (project) => set({ project }),

      updateProject: (partial) =>
        set((state) => ({
          project: state.project ? { ...state.project, ...partial } : null,
        })),

      resetProject: () => set({ project: null, currentStep: 0 }),
    }),
    {
      name: "storybuch-poster",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        project: state.project,
        currentStep: state.currentStep,
      }),
    }
  )
);
