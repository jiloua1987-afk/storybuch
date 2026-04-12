import { create } from "zustand";

export type Tone = "romantisch" | "humorvoll" | "kindgerecht" | "episch" | "biografisch";
export type BookDesign = "kinderbuch" | "romantisch" | "biografie";
export type CoverType = "hardcover" | "softcover";

export interface Character {
  id: string;
  name: string;
  role: string;
  imageUrl?: string;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  imagePrompt?: string;
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

export interface BookProject {
  id: string;
  title: string;
  dedication?: string;
  illustrationStyle?: IllustrationStyle;
  language?: BookLanguage;
  comicStyle?: ComicStyle;
  dialogMode?: DialogMode;
  customDialogs?: CustomDialog[];
  mustHaveSentences?: string;
  storyInput: string;
  guidedAnswers: {
    characters: string;
    location: string;
    timeframe: string;
    specialMoments: string;
  };
  tone: Tone;
  design: BookDesign;
  characters: Character[];
  chapters: Chapter[];
  coverImageUrl?: string;
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

export const useBookStore = create<BookStore>((set) => ({
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
    set((state) => ({
      project: state.project
        ? {
            ...state.project,
            chapters: state.project.chapters.map((c) =>
              c.id === chapterId ? { ...c, ...partial } : c
            ),
          }
        : null,
    })),

  setGenerationProgress: (progress, status) =>
    set({ generationProgress: progress, generationStatus: status }),

  setIsGenerating: (val) => set({ isGenerating: val }),

  setOrderDetails: (details) =>
    set((state) => ({ orderDetails: { ...state.orderDetails, ...details } })),

  resetProject: () =>
    set({ project: null, currentStep: 0, generationProgress: 0, isGenerating: false }),
}));
