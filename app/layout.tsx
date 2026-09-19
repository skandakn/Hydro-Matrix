import type { Metadata } from "next";
import "./globals.css";
import { UIProvider } from "@/context/UIContext";

export const metadata: Metadata = {
  title: "FLOWSHIELD | Flood Simulation & Early Warning Dashboard",
  description: "High-stakes crisis command center and 2.5D hydrological simulation engine for urban flood resilience and early disaster warnings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen overflow-hidden antialiased select-none">
        <UIProvider>
          {children}
        </UIProvider>
      </body>
    </html>
  );
}
