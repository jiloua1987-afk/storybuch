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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bangers&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />
      </head>
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
