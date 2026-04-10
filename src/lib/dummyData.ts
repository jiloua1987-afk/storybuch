import { BookProject } from "@/store/bookStore";

export const DUMMY_PROJECT: BookProject = {
  id: "demo-001",
  title: "Unser Abenteuer in der Toskana",
  storyInput:
    "Im Sommer 2023 fuhren wir als Familie in die Toskana. Es war Emmas erster grosser Urlaub und sie war so aufgeregt, dass sie die ganze Nacht davor kaum schlafen konnte...",
  guidedAnswers: {
    characters: "Papa (ich), Mama Lisa, Tochter Emma (6 Jahre)",
    location: "Toskana, Italien - Florenz, Siena, Chianti-Weinberge",
    timeframe: "Sommer 2023, 2 Wochen",
    specialMoments: "Emmas erster Gelato, Sonnenuntergang ueber Florenz, der verlorene Teddy",
  },
  tone: "kindgerecht",
  design: "kinderbuch",
  characters: [
    { id: "c1", name: "Papa", role: "Erzaehler", imageUrl: "https://api.dicebear.com/8.x/adventurer/svg?seed=papa" },
    { id: "c2", name: "Mama Lisa", role: "Hauptfigur", imageUrl: "https://api.dicebear.com/8.x/adventurer/svg?seed=lisa" },
    { id: "c3", name: "Emma", role: "Hauptfigur", imageUrl: "https://api.dicebear.com/8.x/adventurer/svg?seed=emma" },
  ],
  chapters: [
    {
      id: "ch1",
      title: "Die grosse Reise beginnt",
      content:
        "Es war ein strahlend heller Morgen, als die Familie ihre Koffer ins Auto lud. Emma huepfte aufgeregt von einem Bein aufs andere und fragte alle fuenf Minuten: 'Sind wir bald da?' Papa lachte und erklaerte ihr, dass Italien noch ein kleines Stueckchen weiter weg sei.",
      imageUrl: "https://picsum.photos/seed/travel1/800/500",
      imagePrompt: "A cheerful family loading a car for vacation, cartoon storybook style, warm colors",
    },
    {
      id: "ch2",
      title: "Florenz - Die Stadt der Wunder",
      content:
        "Als sie endlich in Florenz ankamen, blieb Emma mit offenem Mund stehen. Ueberall waren riesige Gebaeude mit bunten Bildern, und auf dem grossen Platz stand eine riesige Kuppel, die fast den Himmel beruehrte. 'Das ist der Dom', erklaerte Mama Lisa. 'Haben da Riesen drin gewohnt?', fragte Emma.",
      imageUrl: "https://picsum.photos/seed/florence/800/500",
      imagePrompt: "A little girl amazed by Florence cathedral, illustrated children's book style",
    },
    {
      id: "ch3",
      title: "Das erste Gelato",
      content:
        "Dann kam der wichtigste Moment des ganzen Urlaubs - zumindest fuer Emma. Eine Eisdiele mit hundert verschiedenen Sorten! Stracciatella, Pistacchio, Fragola... Emma probierte so viele, dass ihre Nase am Ende ganz bunt war. 'Das ist das beste Eis der ganzen Welt!', rief sie.",
      imageUrl: "https://picsum.photos/seed/gelato/800/500",
      imagePrompt: "A little girl eating colorful gelato in Italy, joyful, storybook illustration",
    },
    {
      id: "ch4",
      title: "Der verschwundene Teddy",
      content:
        "Am dritten Tag passierte das Schrecklichste: Emmas Teddy Baerchen war weg! Sie suchten ueberall - im Hotel, im Restaurant, auf dem Marktplatz. Schliesslich fand ein freundlicher Kellner ihn unter einem Tisch. Er hatte ihn sogar mit einer kleinen Schleife geschmueckt.",
      imageUrl: "https://picsum.photos/seed/teddy/800/500",
      imagePrompt: "A lost teddy bear found by a kind Italian waiter, warm storybook style",
    },
    {
      id: "ch5",
      title: "Sonnenuntergang ueber den Weinbergen",
      content:
        "Am letzten Abend sassen sie auf einem Huegel in der Chianti-Region und schauten zu, wie die Sonne hinter den Weinbergen versank. Der Himmel leuchtete in Orange, Pink und Lila. Emma kuschelte sich zwischen Mama und Papa und fluesterte: 'Koennen wir morgen nochmal von vorne anfangen?'",
      imageUrl: "https://picsum.photos/seed/sunset/800/500",
      imagePrompt: "Family watching sunset over Tuscany vineyards, magical golden hour, storybook art",
    },
  ],
  coverImageUrl: "https://picsum.photos/seed/tuscany-cover/800/1100",
  status: "preview",
  createdAt: new Date().toISOString(),
};

export const BOOK_DESIGNS = [
  {
    id: "kinderbuch",
    label: "Kinderbuch",
    description: "Bunte Illustrationen, grosse Schrift, verspielt",
    emoji: "🎨",
    colors: "from-yellow-400 to-orange-400",
  },
  {
    id: "romantisch",
    label: "Romantisches Buch",
    description: "Elegante Aquarelle, weiche Farben, poetisch",
    emoji: "💕",
    colors: "from-pink-400 to-rose-500",
  },
  {
    id: "biografie",
    label: "Klassische Biografie",
    description: "Zeitlose Illustrationen, serioeses Layout",
    emoji: "📖",
    colors: "from-amber-600 to-yellow-700",
  },
];

export const TONES = [
  { id: "kindgerecht", label: "Kindgerecht", emoji: "🌈" },
  { id: "romantisch", label: "Romantisch", emoji: "💖" },
  { id: "humorvoll", label: "Humorvoll", emoji: "😄" },
  { id: "episch", label: "Episch", emoji: "⚔️" },
  { id: "biografisch", label: "Biografisch", emoji: "📜" },
];

export const PRICE_TABLE = {
  hardcover: { standard: 34.99, premium: 44.99 },
  softcover: { standard: 24.99, premium: 29.99 },
};
