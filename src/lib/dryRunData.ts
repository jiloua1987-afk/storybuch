// Dry-Run Mock Data — realistic test data for frontend testing without API costs
// Activate via NEXT_PUBLIC_DRY_RUN=true in .env.local

export const DRY_RUN_DELAY = 800; // ms per step to simulate API latency

export const MOCK_CHARACTERS = [
  {
    name: "Sophie",
    age: 35,
    visual_anchor: "35-year-old woman, long wavy honey-blonde hair, green eyes, light summer dress, warm smile, caucasian",
    bubble_color: "#E8F4FF",
  },
  {
    name: "Leon",
    age: 6,
    visual_anchor: "6-year-old boy, short messy brown hair, blue striped t-shirt, khaki shorts, freckles, big brown eyes",
    bubble_color: "#FFF0F5",
  },
];

export const MOCK_PAGES = [
  {
    id: "page1",
    pageNumber: 1,
    title: "Der große Aufbruch",
    location: "German countryside, sunny morning",
    timeOfDay: "morning",
    panels: [
      { nummer: 1, szene: "Family loading suitcases into car", dialog: "Endlich geht's los!", speaker: "Leon", bubble_type: "shout" as const },
      { nummer: 2, szene: "Sophie checking the map", dialog: "Sardinien, wir kommen!", speaker: "Sophie", bubble_type: "speech" as const },
      { nummer: 3, szene: "Car driving through green hills", dialog: "Sind wir bald da?", speaker: "Leon", bubble_type: "speech" as const },
      { nummer: 4, szene: "Family singing in the car", dialog: null, speaker: null, bubble_type: "caption" as const },
    ],
  },
  {
    id: "page2",
    pageNumber: 2,
    title: "Ankunft am Strand",
    location: "Sardinian beach, turquoise water",
    timeOfDay: "afternoon",
    panels: [
      { nummer: 1, szene: "First view of the beach from hilltop", dialog: "Wow, schau mal!", speaker: "Leon", bubble_type: "shout" as const },
      { nummer: 2, szene: "Leon running toward the water", dialog: "Warte auf mich!", speaker: "Sophie", bubble_type: "speech" as const },
      { nummer: 3, szene: "Sophie setting up beach blanket", dialog: null, speaker: null, bubble_type: null },
    ],
  },
  {
    id: "page3",
    pageNumber: 3,
    title: "Abenteuer im Wasser",
    location: "Crystal clear Mediterranean sea",
    timeOfDay: "golden hour",
    panels: [
      { nummer: 1, szene: "Leon splashing in shallow water", dialog: "Das Wasser ist warm!", speaker: "Leon", bubble_type: "speech" as const },
      { nummer: 2, szene: "Sophie and Leon building sandcastle", dialog: "Noch einen Turm!", speaker: "Leon", bubble_type: "speech" as const },
      { nummer: 3, szene: "Beautiful sunset over the sea", dialog: null, speaker: "narrator", bubble_type: "caption" as const },
      { nummer: 4, szene: "Family watching sunset together", dialog: "Der schönste Tag.", speaker: "Sophie", bubble_type: "speech" as const },
      { nummer: 5, szene: "Leon falling asleep on blanket", dialog: null, speaker: null, bubble_type: null },
    ],
  },
  {
    id: "page4",
    pageNumber: 4,
    title: "Bis zum nächsten Mal",
    location: "Sardinian harbor at sunset",
    timeOfDay: "sunset",
    panels: [
      { nummer: 1, szene: "Family packing up beach things", dialog: "Schon vorbei?", speaker: "Leon", bubble_type: "speech" as const },
      { nummer: 2, szene: "Leon hugging Sophie on the beach", dialog: "Danke, Mama.", speaker: "Leon", bubble_type: "speech" as const },
      { nummer: 3, szene: "Family walking toward harbor", dialog: "Wir kommen wieder!", speaker: "Sophie", bubble_type: "speech" as const },
      { nummer: 4, szene: "Boat sailing into golden sunset", dialog: null, speaker: null, bubble_type: null },
    ],
  },
];

// Placeholder images (free, no API cost)
export const MOCK_COVER_URL = "https://picsum.photos/seed/comic-cover-dry/1024/1792";

export function getMockPageUrl(pageIndex: number): string {
  return `https://picsum.photos/seed/comic-page-${pageIndex}/1024/1792`;
}

export const MOCK_ENDING = {
  endingText: "Manche Momente sind so kostbar, dass man sie für immer festhalten möchte. Dieser Urlaub war einer davon — voller Lachen, Sonne und der Gewissheit, dass das Beste im Leben die Menschen sind, mit denen man es teilt.",
  dedication: "Für Leon — der mutigste kleine Abenteurer der Welt.",
};
