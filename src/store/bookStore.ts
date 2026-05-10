import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Tone = "romantisch" | "humorvoll" | "kindgerecht" | "episch" | "biografisch";
export type BookDesign = "kinderbuch" | "romantisch" | "biografie";
export type CoverType = "hardcover" | "softcover";

export interface Character {
  id: string;
  name: string;
  role: string;
  imageUrl?: string;
  visual_anchor?: string;
  inPhoto?: boolean;
}

export interface ChapterPanel {
  nummer: number;
  szene?: string;
  dialog?: string;  // Legacy: single dialog
  speaker?: string; // Legacy: single speaker
  dialogs?: Array<{ speaker: string; text: string }>; // NEW: multi-bubble support
  bubble_type?: "speech" | "caption" | "shout" | "thought";
}

export interface PanelPosition {
  nummer: number;
  bubbleIndex: number; // REQUIRED: identifies which bubble in multi-bubble panels
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  imagePrompt?: string;
  panels?: ChapterPanel[];
  panelPositions?: PanelPosition[] | null;
  extraBubbles?: Array<{ id: number; top: number; left: number; dialog: string; speaker: string }>; // NEW: User-added bubbles
  hiddenBubbles?: string[]; // NEW: IDs of hidden/deleted bubbles (format: "panelIndex-bubbleIndex")
}

export type ComicStyle = "action" | "emotional" | "humor";
export type DialogMode = "auto" | "custom";

export interface CustomDialog {
  id: string;
  speaker: string;
  text: string;
}

export type IllustrationStyle = "comic" | "aquarell" | "bleistift" | "realistisch";
export type BookLanguage = "de" | "en" | "fr" | "es";

export interface EndingData {
  endingText: string;
  dedication: string;
  dedicationFrom?: string;
}

export interface BookProject {
  id: string;
  title: string;
  dedication?: string;
  dedicationFrom?: string;
  endingData?: EndingData;
  illustrationStyle?: IllustrationStyle;
  language?: BookLanguage;
  comicStyle?: ComicStyle;
  dialogMode?: DialogMode;
  customDialogs?: CustomDialog[];
  mustHaveSentences?: string;
  numPages?: number;            // Anzahl Comic-Seiten (Standard: 5, Premium: 8+)
  photoMode?: "family" | "individual" | "none";  // NEW: Photo upload mode
  storyInput: string;
  guidedAnswers: {
    characters: string;
    location: string;
    timeframe: string;
    specialMoments: string;
    [key: string]: string;
  };
  tone: Tone;
  design: BookDesign;
  characters: Character[];
  chapters: Chapter[];
  coverImageUrl?: string;
  referenceImages?: string[];   // Base64 Personenfotos (legacy, wird durch referenceImageUrls ersetzt)
  referenceImageUrls?: { label: string; url: string }[]; // Supabase URLs der hochgeladenen Fotos
  locationImages?: string[];    // Base64 Ortsfotos
  status: "draft" | "generating" | "preview" | "checkout" | "ordered";
  createdAt: string;
}

export interface OrderDetails {
  coverType: CoverType;
  paperQuality: "standard" | "premium";
  copies: number;
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    zip: string;
    country: string;
  };
}

interface BookStore {
  currentStep: number;
  project: BookProject | null;
  orderDetails: OrderDetails;
  generationProgress: number;
  generationStatus: string;
  isGenerating: boolean;

  setStep: (step: number) => void;
  setProject: (project: BookProject) => void;
  updateProject: (partial: Partial<BookProject>) => void;
  updateChapter: (chapterId: string, partial: Partial<Chapter>) => void;
  setGenerationProgress: (progress: number, status: string) => void;
  setIsGenerating: (val: boolean) => void;
  setOrderDetails: (details: Partial<OrderDetails>) => void;
  resetProject: () => void;
}

const defaultOrder: OrderDetails = {
  coverType: "hardcover",
  paperQuality: "premium",
  copies: 1,
  shippingAddress: { name: "", street: "", city: "", zip: "", country: "Deutschland" },
};

export const useBookStore = create<BookStore>()(
  persist(
    (set) => ({
      currentStep: 0,
      project: null,
      orderDetails: defaultOrder,
      generationProgress: 0,
      generationStatus: "",
      isGenerating: false,

      setStep: (step) => set({ currentStep: step }),

      setProject: (project) => set({ project }),

      updateProject: (partial) =>
        set((state) => ({
          project: state.project ? { ...state.project, ...partial } : null,
        })),

      updateChapter: (chapterId, partial) =>
        set((state) => {
          console.log(`📝 Store: updateChapter called for ${chapterId}`, partial);
          const result = {
            project: state.project
              ? {
                  ...state.project,
                  chapters: state.project.chapters.map((c) =>
                    c.id === chapterId ? { ...c, ...partial } : c
                  ),
                }
              : null,
          };
          console.log(`  → Updated chapter ${chapterId}, panelPositions: ${result.project?.chapters.find(c => c.id === chapterId)?.panelPositions?.length || 0}`);
          return result;
        }),

      setGenerationProgress: (progress, status) =>
        set({ generationProgress: progress, generationStatus: status }),

      setIsGenerating: (val) => set({ isGenerating: val }),

      setOrderDetails: (details) =>
        set((state) => ({ orderDetails: { ...state.orderDetails, ...details } })),

      resetProject: () =>
        set({ project: null, currentStep: 0, generationProgress: 0, isGenerating: false }),
    }),
    {
      name: "storybuch-project", // localStorage key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        project: state.project,
        currentStep: state.currentStep,
      }),
      onRehydrateStorage: () => {
        console.log('🔄 Zustand: Starting rehydration from localStorage');
        return (state, error) => {
          if (error) {
            console.error('❌ Zustand: Rehydration failed:', error);
          } else {
            console.log('✓ Zustand: Rehydration complete');
            console.log(`  → Project: ${state?.project?.title || 'none'}`);
            console.log(`  → Chapters: ${state?.project?.chapters?.length || 0}`);
            if (state?.project?.chapters) {
              state.project.chapters.forEach((ch, i) => {
                console.log(`  → Chapter ${i + 1}: "${ch.title}" - ${ch.panelPositions?.length || 0} positions`);
              });
            }
          }
        };
      },
    }
  )
);
