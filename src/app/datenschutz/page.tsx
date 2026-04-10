import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Datenschutz() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-20 space-y-8">
        <h1 className="text-4xl font-bold text-brand-800" style={{ fontFamily: "var(--font-display)" }}>
          Datenschutzerklärung
        </h1>
        <div className="prose prose-gray max-w-none space-y-6 text-gray-600 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-brand-700">1. Verantwortlicher</h2>
            <p>Verantwortlich für die Datenverarbeitung auf dieser Website ist:<br />
            MyStoryBook<br />
            [Straße, PLZ, Stadt]<br />
            E-Mail: kontakt@mystorybook.de</p>
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-brand-700">2. Erhobene Daten</h2>
            <p>Wir erheben folgende Daten: Name, E-Mail-Adresse, Lieferadresse, hochgeladene Bilder sowie Texteingaben zur Buchgenerierung. Diese Daten werden ausschließlich zur Erstellung und Lieferung deines Buches verwendet.</p>
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-brand-700">3. Bilder und Fotos</h2>
            <p>Hochgeladene Bilder werden ausschließlich zur Erstellung deines persönlichen Buches verwendet. Sie werden nicht an Dritte weitergegeben und nach Abschluss der Bestellung gelöscht. Du bestätigst beim Upload, dass du die Einwilligung aller abgebildeten Personen hast.</p>
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-brand-700">4. Zahlungsdaten</h2>
            <p>Zahlungen werden über Stripe abgewickelt. Wir speichern keine Kreditkartendaten. Es gelten die Datenschutzbestimmungen von Stripe (stripe.com/privacy).</p>
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-brand-700">5. Deine Rechte</h2>
            <p>Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung deiner Daten. Wende dich dazu an: kontakt@mystorybook.de</p>
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-brand-700">6. Cookies</h2>
            <p>Diese Website verwendet nur technisch notwendige Cookies. Es werden keine Tracking- oder Werbe-Cookies eingesetzt.</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
