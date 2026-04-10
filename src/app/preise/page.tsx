"use client";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Image from "next/image";
import Link from "next/link";

const PLANS = [
  {
    id: "softcover",
    name: "Softcover",
    emoji: "📄",
    popular: false,
    prices: { standard: 24.99, premium: 29.99 },
    features: [
      "Bis zu 30 Seiten",
      "Illustrationen pro Kapitel",
      "Titelseite & Inhaltsverzeichnis",
      "Widmungsseite",
      "PDF-Download inklusive",
      "Versand in 5–7 Werktagen",
    ],
    color: "from-gray-50 to-gray-100",
    border: "border-gray-200",
  },
  {
    id: "hardcover",
    name: "Hardcover",
    emoji: "📕",
    popular: true,
    prices: { standard: 34.99, premium: 44.99 },
    features: [
      "Bis zu 30 Seiten",
      "Illustrationen pro Kapitel",
      "Titelseite & Inhaltsverzeichnis",
      "Widmungsseite",
      "PDF-Download inklusive",
      "Versand in 5–7 Werktagen",
      "Stabiler Hardcover-Einband",
      "Hochwertigeres Druckbild",
    ],
    color: "from-brand-50 to-brand-100",
    border: "border-brand-300",
  },
];

const PAPER = [
  {
    id: "standard",
    name: "Standard",
    desc: "80 g/m² Offsetpapier",
    detail: "Hochwertig, matt, für alle Stile geeignet",
  },
  {
    id: "premium",
    name: "Premium",
    desc: "130 g/m² Kunstdruckpapier",
    detail: "Brillante Farben, leicht glänzend – ideal für Comic & Aquarell",
    recommended: true,
  },
];

const FAQS_PREISE = [
  { q: "Gibt es Mengenrabatte?", a: "Ab 3 Exemplaren erhältst du 10% Rabatt, ab 5 Exemplaren 15%. Der Rabatt wird automatisch im Checkout berechnet." },
  { q: "Was kostet der Versand?", a: "Der Versand kostet pauschal 4,99 € per DHL. Ab einem Bestellwert von 49 € ist der Versand kostenlos." },
  { q: "Kann ich das Buch vor dem Druck bearbeiten?", a: "Ja – du siehst eine vollständige Vorschau und kannst Texte, Bilder und Reihenfolge anpassen, bevor du bestellst." },
  { q: "Wie viele Seiten hat das Buch?", a: "Ein Buch hat standardmäßig bis zu 30 Seiten. Mehr Seiten sind auf Anfrage möglich." },
];

export default function Preise() {
  return (
    <>
      <Navbar />
      <main className="bg-gradient-to-br from-brand-50 via-white to-warm-50 min-h-screen">

        {/* Hero */}
        <section className="max-w-5xl mx-auto px-4 pt-20 pb-10 text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 px-4 py-1.5 rounded-full text-sm font-medium">
              💰 Einfache, transparente Preise
            </div>
            <h1 className="text-4xl font-bold text-brand-900" style={{ fontFamily: "var(--font-display)" }}>
              Dein Buch. Dein Preis.
            </h1>
            <p className="text-gray-500 max-w-xl mx-auto">
              Keine versteckten Kosten. Du siehst den Gesamtpreis bevor du bestellst.
            </p>
          </motion.div>
        </section>

        {/* Bild */}
        <section className="max-w-2xl mx-auto px-4 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-3xl overflow-hidden shadow-2xl border border-brand-100"
          >
            <Image
              src="/image.png"
              alt="MyStoryBook Beispiel"
              width={800}
              height={500}
              className="w-full h-auto"
            />
          </motion.div>
        </section>

        {/* Preispläne */}
        <section className="max-w-4xl mx-auto px-4 pb-16">
          <div className="grid md:grid-cols-2 gap-6">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-3xl border-2 ${plan.border} bg-gradient-to-br ${plan.color} p-8 space-y-6`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                    ⭐ Beliebteste Wahl
                  </div>
                )}
                <div className="space-y-2">
                  <div className="text-3xl">{plan.emoji}</div>
                  <h2 className="text-2xl font-bold text-brand-800" style={{ fontFamily: "var(--font-display)" }}>
                    {plan.name}
                  </h2>
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-brand-700">ab {plan.prices.standard.toFixed(2)} €</span>
                    </div>
                    <p className="text-xs text-gray-400">Standard-Papier · Premium ab {plan.prices.premium.toFixed(2)} €</p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-brand-500 font-bold">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/"
                  className={`block text-center py-3 rounded-2xl font-medium transition-all ${
                    plan.popular
                      ? "bg-brand-500 text-white hover:bg-brand-600 shadow-lg shadow-brand-200"
                      : "bg-white text-brand-700 border-2 border-brand-200 hover:border-brand-400"
                  }`}
                >
                  Jetzt Buch erstellen ✨
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Papierqualität */}
        <section className="bg-white py-16">
          <div className="max-w-3xl mx-auto px-4 space-y-8">
            <h2 className="text-2xl font-bold text-brand-800 text-center" style={{ fontFamily: "var(--font-display)" }}>
              Papierqualität
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {PAPER.map((p) => (
                <div
                  key={p.id}
                  className={`p-6 rounded-2xl border-2 space-y-2 ${
                    p.recommended ? "border-brand-300 bg-brand-50" : "border-gray-100 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-brand-800">{p.name}</h3>
                    {p.recommended && (
                      <span className="text-xs bg-brand-500 text-white px-2 py-0.5 rounded-full">Empfohlen</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-600">{p.desc}</p>
                  <p className="text-xs text-gray-400">{p.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Versand */}
        <section className="max-w-3xl mx-auto px-4 py-16">
          <div className="bg-brand-50 rounded-3xl p-8 grid md:grid-cols-3 gap-6 text-center">
            {[
              { emoji: "📦", title: "Versand", desc: "4,99 € pauschal\nAb 49 € kostenlos" },
              { emoji: "🚚", title: "Lieferzeit", desc: "5–7 Werktage\nper DHL" },
              { emoji: "🌍", title: "Liefergebiet", desc: "Deutschland, Österreich\nSchweiz, Luxemburg" },
            ].map((s) => (
              <div key={s.title} className="space-y-2">
                <div className="text-3xl">{s.emoji}</div>
                <div className="font-bold text-brand-800">{s.title}</div>
                <div className="text-sm text-gray-500 whitespace-pre-line">{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Preise */}
        <section className="bg-white py-16">
          <div className="max-w-3xl mx-auto px-4 space-y-6">
            <h2 className="text-2xl font-bold text-brand-800 text-center" style={{ fontFamily: "var(--font-display)" }}>
              Häufige Fragen zu Preisen
            </h2>
            <div className="space-y-4">
              {FAQS_PREISE.map((f) => (
                <div key={f.q} className="bg-brand-50 rounded-2xl p-5 space-y-2">
                  <p className="font-medium text-brand-800">{f.q}</p>
                  <p className="text-sm text-gray-500">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 text-center space-y-4 bg-gradient-to-r from-brand-500 to-warm-500">
          <h2 className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
            Starte jetzt – kostenlos & unverbindlich
          </h2>
          <p className="text-white/80 text-sm">Du zahlst erst wenn du bestellst.</p>
          <Link
            href="/"
            className="inline-block bg-white text-brand-700 px-8 py-4 rounded-2xl font-medium text-lg hover:bg-brand-50 shadow-xl transition-all"
          >
            Buch erstellen ✨
          </Link>
        </section>

      </main>
      <Footer />
    </>
  );
}
