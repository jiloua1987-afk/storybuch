import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Image from "next/image";

const PLANS = [
  {
    name: "Softcover",
    emoji: "📄",
    prices: [
      { quality: "Standard", price: "24,99 €", desc: "80g/m² Offsetpapier, matt" },
      { quality: "Premium", price: "29,99 €", desc: "130g/m² Kunstdruckpapier, glänzend" },
    ],
    features: [
      "Ca. 20–30 Seiten",
      "Vollfarb-Illustrationen",
      "Dein gewählter Stil",
      "Widmungsseite",
      "Inhaltsverzeichnis",
      "5–7 Werktage Lieferzeit",
    ],
    highlight: false,
  },
  {
    name: "Hardcover",
    emoji: "📕",
    prices: [
      { quality: "Standard", price: "34,99 €", desc: "80g/m² Offsetpapier, matt" },
      { quality: "Premium", price: "44,99 €", desc: "130g/m² Kunstdruckpapier, glänzend" },
    ],
    features: [
      "Ca. 20–30 Seiten",
      "Vollfarb-Illustrationen",
      "Dein gewählter Stil",
      "Widmungsseite",
      "Inhaltsverzeichnis",
      "Stabiler Hardcover-Einband",
      "5–7 Werktage Lieferzeit",
    ],
    highlight: true,
  },
];

const INCLUDED = [
  { emoji: "🎨", text: "Individuelle Illustrationen für jedes Kapitel" },
  { emoji: "✍️", text: "Professionell ausgearbeiteter Buchtext" },
  { emoji: "📐", text: "Hochwertiges Layout & Titelblatt" },
  { emoji: "💌", text: "Persönliche Widmungsseite" },
  { emoji: "📄", text: "PDF-Download inklusive" },
  { emoji: "🌍", text: "Verfügbar in 4 Sprachen" },
];

export default function Preise() {
  return (
    <>
      <Navbar />
      <main className="bg-gradient-to-br from-brand-50 via-white to-warm-50 min-h-screen">

        {/* Hero */}
        <section className="max-w-5xl mx-auto px-4 pt-20 pb-16 text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 px-4 py-1.5 rounded-full text-sm font-medium">
            💰 Faire Preise
          </div>
          <h1 className="text-4xl font-bold text-brand-800" style={{ fontFamily: "var(--font-display)" }}>
            Ein Buch. Eine Erinnerung. Für immer.
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            Kein Abo, keine versteckten Kosten. Du zahlst einmalig – und bekommst ein Buch, das ein Leben lang hält.
          </p>
        </section>

        {/* Preiskarten */}
        <section className="max-w-4xl mx-auto px-4 pb-16">
          <div className="grid md:grid-cols-2 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-3xl p-8 space-y-6 border-2 ${
                  plan.highlight
                    ? "border-brand-400 bg-white shadow-xl shadow-brand-100"
                    : "border-gray-100 bg-white shadow-sm"
                }`}
              >
                {plan.highlight && (
                  <div className="inline-flex items-center gap-1 bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    ⭐ Beliebteste Wahl
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{plan.emoji}</span>
                  <h2 className="text-2xl font-bold text-brand-800" style={{ fontFamily: "var(--font-display)" }}>
                    {plan.name}
                  </h2>
                </div>

                {/* Preise */}
                <div className="space-y-3">
                  {plan.prices.map((p) => (
                    <div key={p.quality} className="flex items-center justify-between bg-brand-50 rounded-2xl px-4 py-3">
                      <div>
                        <div className="font-semibold text-brand-800 text-sm">{p.quality}</div>
                        <div className="text-xs text-gray-400">{p.desc}</div>
                      </div>
                      <div className="text-xl font-bold text-brand-600">{p.price}</div>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-brand-400 font-bold">✓</span> {f}
                    </li>
                  ))}
                </ul>

                <a
                  href="/"
                  className={`block text-center py-3 rounded-2xl font-medium transition-all ${
                    plan.highlight
                      ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-200 hover:from-brand-600 hover:to-brand-700"
                      : "bg-brand-50 text-brand-700 hover:bg-brand-100"
                  }`}
                >
                  Jetzt Buch erstellen ✨
                </a>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Alle Preise inkl. MwSt. · Versand 4,99 € · Ab 2 Exemplaren Mengenrabatt möglich
          </p>
        </section>

        {/* Was ist inklusive */}
        <section className="bg-white py-20">
          <div className="max-w-4xl mx-auto px-4 space-y-10">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold text-brand-800" style={{ fontFamily: "var(--font-display)" }}>
                In jedem Buch inklusive
              </h2>
              <p className="text-gray-400 text-sm">Egal welche Option du wählst – das bekommst du immer.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {INCLUDED.map((item) => (
                <div key={item.text} className="flex items-start gap-3 p-4 bg-brand-50 rounded-2xl">
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="text-sm text-brand-800 font-medium leading-snug">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-5xl mx-auto px-4 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div className="relative h-[480px] rounded-3xl overflow-hidden shadow-2xl">
            <Image
              src="/image_einzel.png"
              alt="Familie liest MyStoryBook"
              fill
              className="object-cover object-top"
            />
          </div>
          <div className="space-y-6 max-w-xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-brand-800" style={{ fontFamily: "var(--font-display)" }}>
              Das persönlichste Geschenk, das du machen kannst.
            </h2>
            <p className="text-gray-500 leading-relaxed">
              Kein Gutschein, kein Standardgeschenk. Ein Buch, das nur für diese eine Person existiert – mit echten Erinnerungen, echten Momenten, liebevoll illustriert.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2"><span className="text-brand-400">✓</span> Vorschau vor der Bestellung</li>
              <li className="flex items-center gap-2"><span className="text-brand-400">✓</span> Alles bearbeitbar – Texte, Bilder, Reihenfolge</li>
              <li className="flex items-center gap-2"><span className="text-brand-400">✓</span> Stichpunkte reichen – kein Schreibtalent nötig</li>
              <li className="flex items-center gap-2"><span className="text-brand-400">✓</span> 30.000+ zufriedene Kunden</li>
            </ul>
            <a
              href="/"
              className="inline-block bg-gradient-to-r from-brand-500 to-brand-600 text-white px-8 py-4 rounded-2xl font-medium shadow-lg shadow-brand-200 hover:from-brand-600 hover:to-brand-700 transition-all"
            >
              Jetzt Buch erstellen ✨
            </a>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
