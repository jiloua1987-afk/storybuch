import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function AGB() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-20 space-y-8">
        <h1 className="text-4xl font-bold text-brand-800" style={{ fontFamily: "var(--font-display)" }}>
          Allgemeine Geschäftsbedingungen
        </h1>
        <div className="space-y-6 text-gray-600 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-xl font-bold text-brand-700">§ 1 Geltungsbereich</h2>
            <p>Diese AGB gelten für alle Bestellungen über mystorybook.de zwischen MyStoryBook und Verbrauchern (§ 13 BGB).</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-xl font-bold text-brand-700">§ 2 Vertragsschluss</h2>
            <p>Der Vertrag kommt zustande, wenn du deine Bestellung abschickst und wir eine Bestellbestätigung per E-Mail senden.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-xl font-bold text-brand-700">§ 3 Preise und Zahlung</h2>
            <p>Alle Preise sind Endpreise inkl. gesetzlicher MwSt. Die Zahlung erfolgt über Stripe (Kreditkarte, PayPal).</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-xl font-bold text-brand-700">§ 4 Lieferung</h2>
            <p>Die Lieferzeit beträgt 5–7 Werktage nach Bestelleingang. Der Versand erfolgt per DHL.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-xl font-bold text-brand-700">§ 5 Widerrufsrecht</h2>
            <p>Da es sich um personalisierte Waren handelt, besteht gemäß § 312g Abs. 2 Nr. 1 BGB kein Widerrufsrecht nach Produktionsbeginn. Du kannst die Bestellung bis zum Start der Produktion kostenlos stornieren.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-xl font-bold text-brand-700">§ 6 Urheberrecht</h2>
            <p>Du bestätigst, dass du das Recht hast, die hochgeladenen Bilder und Texte zu verwenden. MyStoryBook übernimmt keine Haftung für Rechtsverletzungen durch vom Nutzer bereitgestellte Inhalte.</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
