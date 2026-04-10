import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Impressum() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-20 space-y-8">
        <h1 className="text-4xl font-bold text-brand-800" style={{ fontFamily: "var(--font-display)" }}>
          Impressum
        </h1>
        <div className="space-y-6 text-gray-600 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-xl font-bold text-brand-700">Angaben gemäß § 5 TMG</h2>
            <p>MyStoryBook<br />
            [Vorname Nachname]<br />
            [Straße Hausnummer]<br />
            [PLZ Stadt]<br />
            Deutschland</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-xl font-bold text-brand-700">Kontakt</h2>
            <p>E-Mail: kontakt@mystorybook.de</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-xl font-bold text-brand-700">Umsatzsteuer-ID</h2>
            <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG:<br />[USt-IdNr. eintragen]</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-xl font-bold text-brand-700">Streitschlichtung</h2>
            <p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr. Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
