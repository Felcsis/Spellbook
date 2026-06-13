import "~/styles/globals.css";
import { type Metadata } from "next";
import { Cinzel, Cormorant_Garamond, Playfair_Display } from "next/font/google";
import { TRPCReactProvider } from "~/trpc/react";
import { Providers } from "./providers";
import { ThemeProvider } from "./_theme-provider";

export const metadata: Metadata = {
  title: "Salon Spellbook",
  description: "Varázslatos szépség, minden napra",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  weight: ["400", "600"],
});
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
});
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" className={`${cinzel.variable} ${cormorant.variable} ${playfair.variable}`}>
      <head>
        {/* prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();` }} />
      </head>
      <body>
        <ThemeProvider>
          <Providers>
            <TRPCReactProvider>{children}</TRPCReactProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
