import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
          title: "MyComicStory – Deine Erinnerungen als Comic",
  description: "Verwandle deine Erinnerungen in einen personalisierten Comic mit echten Dialogen – gedruckt und geliefert.",
  keywords: ["Comic erstellen", "personalisierter Comic", "Erinnerungen als Comic", "Comic Buch", "Geschenk Comic"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <Toaster
          position="top-center"
          toastOptions={{
            style: { background: "#2d1b4e", color: "#fff", borderRadius: "12px" },
            duration: 4000,
          }}
        />
        {children}
      </body>
    </html>
  );
}
