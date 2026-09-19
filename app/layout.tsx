import type { Metadata } from "next";
import "./globals.css";
import { UIProvider } from "@/context/UIContext";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "HYDRO MATRIX | Flood Simulation & Early Warning Dashboard",
  description: "High-stakes crisis command center and 2.5D hydrological simulation engine for urban flood resilience and early disaster warnings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#06b6d4",
          colorBackground: "#0f172a",
          colorText: "#f8fafc",
          colorTextSecondary: "#94a3b8",
          colorInputBackground: "#020617",
          colorInputText: "#f8fafc",
        },
      }}
    >
      <html lang="en" className="dark">
        <body className="bg-slate-950 text-slate-100 min-h-screen overflow-hidden antialiased select-none">
          <UIProvider>
            {children}
          </UIProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

