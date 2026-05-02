import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Image from "next/image";

const PLANS = [
  {
    name: "Softcover",
    prices: [
      { quality: "Standard", price: "24,99 €", desc: "80g/m² Offsetpapier, matt" },
      { quality: "Premium",  price: "29,99 €", desc: "130g/m² Kunstdruckpapier, glänzend" },
    ],
    features: ["Ca. 20–30 Seiten", "Vollfarb-Illustrationen", "Widmungsseite", "Inhaltsverzeichnis", "5–7 Werktage Lieferzeit"],
    highlight: false,
  },
  {
    name: "Hardcover",
    prices: [
      { quality: "Standard", price: "34,99 €", desc: "80g/m² Offsetpapier, matt" },
      { quality: "Premium",  price: "44,99 €", desc: "130g/m² Kunstdruckpapier, glänzend" },
    ],
    features: ["Ca. 20–30 Seiten", "Vollfarb-Illustrationen", "Widmungsseite", "Inhaltsverzeichnis", "Stabiler Hardcover-Einband", "5–7 Werktage Lieferzeit"],
    highlight: true,
  },
];

const INCLUDED = [
  { title: "Individuelle Illustrationen",  desc: "Für jedes Kapitel eigens erstellt" },
  { title: "Professioneller Buchtext",      desc: "Vollständig ausgearbeitet" },
  { title: "Hochwertiges Layout",           desc: "Titelblatt und Kapitelstruktur" },
  { title: "Persönliche Widmungsseite",     desc: "Erscheint auf Seite 1" },
  { title: "PDF-Download inklusive",        desc: "Druckfertig, sofort verfügbar" },
  { title: "4 Sprachen verfügbar",          desc: "DE, EN, FR, ES" },
];

export default function Preise() {
  return (
    <>
      <Navbar />
      <main className="bg-[#fdfaf7]">

        {/* Hero */}
        <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center space-y-4">
          <div className="inline-block bg-brand-50 text-brand-700 text-xs font-medium px-3 py-1.5 rounded-full border border-brand-200">
            Faire Preise
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-semibold text-gray-900">
            Ein Comic. Eine Erinnerung. Für immer.
          </h1>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">
            Kein Abo, keine versteckten Kosten. Du zahlst einmalig – und bekommst ein Buch, das ein Leben lang hält.
          </p>
        </section>

        {/* Preiskarten */}
        <section className="bg-white py-20">
          <div className="max-w-4xl mx-auto px-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-2xl p-8 space-y-6 border ${plan.highlight ? "border-brand-400 shadow-lg shadow-brand-100" : "border-gray-200"}`}
                >
                  {plan.highlight && (
                    <div className="inline-block bg-brand-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                      Beliebteste Wahl
                    </div>
                  )}
                  <h2 className="font-display text-2xl font-semibold text-gray-900">{plan.name}</h2>
                  <div className="space-y-3">
                    {plan.prices.map((p) => (
                      <div key={p.quality} className="flex items-center justify-between bg-brand-50 rounded-xl px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{p.quality}</p>
                          <p className="text-xs text-gray-500">{p.desc}</p>
                        </div>
                        <p className="text-xl font-semibold text-brand-600">{p.price}</p>
                      </div>
                    ))}
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-4 h-4 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1 4l2 2 4-4" stroke="#7D6B56" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a href="/" className={`block text-center py-3 rounded-xl font-medium transition-colors ${plan.highlight ? "bg-brand-600 text-white hover:bg-brand-700" : "bg-brand-50 text-brand-700 hover:bg-brand-100"}`}>
                    Jetzt Comic erstellen
                  </a>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-gray-400">
              Alle Preise inkl. MwSt. · Versand 4,99 € · Ab 2 Exemplaren Mengenrabatt möglich
            </p>
          </div>
        </section>

        {/* Inklusive */}
        <section className="bg-brand-50 py-20">
          <div className="max-w-5xl mx-auto px-6 space-y-10">
            <div className="text-center space-y-3">
              <h2 className="font-display text-3xl font-semibold text-gray-900">In jedem Buch inklusive</h2>
              <p className="text-gray-600">Egal welche Option du wählst – das bekommst du immer.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {INCLUDED.map((item) => (
                <div key={item.title} className="bg-white rounded-xl p-5 border border-brand-200 space-y-1">
                  <p className="font-medium text-gray-900 text-sm">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bild + CTA */}
        <section className="bg-white py-20">
          <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-14 items-center">
            <div className="relative h-[420px] rounded-2xl overflow-hidden shadow-xl">
              <Image src="/image_einzel.png" alt="MyComicStory Beispiel" fill className="object-cover object-top" />
            </div>
            <div className="space-y-6">
              <h2 className="font-display text-3xl font-semibold text-gray-900">
                Das persönlichste Geschenk, das du machen kannst.
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Kein Gutschein, kein Standardgeschenk. Ein Buch, das nur für diese eine Person existiert – mit echten Erinnerungen, echten Momenten, liebevoll illustriert.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                {["Vorschau vor der Bestellung", "Alles bearbeitbar – Texte, Bilder, Reihenfolge", "Stichpunkte reichen – kein Schreibtalent nötig", "30.000+ zufriedene Kunden"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1 4l2 2 4-4" stroke="#7D6B56" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <a href="/" className="inline-block bg-brand-600 text-white px-8 py-3.5 rounded-xl font-medium hover:bg-brand-700 transition-colors">
                Jetzt Comic erstellen
              </a>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
