import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function AGB() {
  return (
    <>
      <Navbar />
      <main className="bg-[#fdfaf7] min-h-screen">
        <div className="max-w-3xl mx-auto px-6 py-20 space-y-10">
          <h1 className="font-display text-4xl font-semibold text-[#1f1a2e]">Allgemeine Geschäftsbedingungen</h1>
          <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-8 text-gray-500 leading-relaxed text-sm">
            {[
              { title: "§ 1 Geltungsbereich", body: "Diese AGB gelten für alle Bestellungen über mycomicstory.de zwischen MyComicStory und Verbrauchern (§ 13 BGB)." },
              { title: "§ 2 Vertragsschluss", body: "Der Vertrag kommt zustande, wenn du deine Bestellung abschickst und wir eine Bestellbestätigung per E-Mail senden." },
              { title: "§ 3 Preise und Zahlung", body: "Alle Preise sind Endpreise inkl. gesetzlicher MwSt. Die Zahlung erfolgt über Stripe (Kreditkarte, PayPal)." },
              { title: "§ 4 Lieferung", body: "Die Lieferzeit beträgt 5–7 Werktage nach Bestelleingang. Der Versand erfolgt per DHL." },
              { title: "§ 5 Widerrufsrecht", body: "Da es sich um personalisierte Waren handelt, besteht gemäß § 312g Abs. 2 Nr. 1 BGB kein Widerrufsrecht nach Produktionsbeginn. Du kannst die Bestellung bis zum Start der Produktion kostenlos stornieren." },
              { title: "§ 6 Urheberrecht", body: "Du bestätigst, dass du das Recht hast, die hochgeladenen Bilder und Texte zu verwenden. MyComicStory übernimmt keine Haftung für Rechtsverletzungen durch vom Nutzer bereitgestellte Inhalte." },
            ].map((s) => (
              <section key={s.title} className="space-y-2">
                <h2 className="font-semibold text-[#1f1a2e] text-base">{s.title}</h2>
                <p>{s.body}</p>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
