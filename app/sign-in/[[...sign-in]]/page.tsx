import React from "react";
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { ShieldAlert, ArrowLeft, Terminal, Cpu } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-100 overflow-hidden px-4">
      {/* Background ambient lighting effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.15),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Cyber tactical grid background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#06b6d4 1px, transparent 1px), linear-gradient(90deg, #06b6d4 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Navigation back */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 text-xs text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 backdrop-blur transition-all duration-150 group"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
          <span>Return to Command Center</span>
        </Link>
      </div>

      {/* Header / Brand */}
      <div className="relative z-10 mb-6 flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-950/60 shadow-lg shadow-cyan-500/20 mb-3">
          <ShieldAlert className="h-6 w-6 text-cyan-400" />
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl md:text-2xl font-black tracking-wider text-white">
            FLOW<span className="text-cyan-400">SHIELD</span>
          </h1>
          <span className="rounded bg-cyan-950 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300 border border-cyan-500/40">
            SECURE ACCESS
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400 max-w-sm">
          Guwahati Bahini/Bharalu Basin • Incident Command & Hydrological Operations System
        </p>

        <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-cyan-400/80 bg-cyan-950/30 border border-cyan-500/20 px-2.5 py-0.5 rounded-full">
          <Terminal className="h-3 w-3" />
          <span>OPERATOR CREDENTIAL VERIFICATION</span>
        </div>
      </div>

      {/* Clerk SignIn Container */}
      <div className="relative z-10 flex items-center justify-center">
        <SignIn
          appearance={{
            elements: {
              card: "bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl rounded-2xl text-slate-100",
              headerTitle: "text-slate-100 font-bold tracking-wide",
              headerSubtitle: "text-slate-400 text-xs",
              socialButtonsBlockButton:
                "bg-slate-800/80 border border-slate-700 hover:bg-slate-700/80 text-slate-200 text-xs transition-all",
              socialButtonsBlockButtonText: "text-slate-200 font-medium text-xs",
              dividerLine: "bg-slate-800",
              dividerText: "text-slate-500 text-xs",
              formFieldLabel: "text-slate-300 text-xs font-medium",
              formFieldInput:
                "bg-slate-950/80 border-slate-800 text-slate-100 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm rounded-lg",
              formButtonPrimary:
                "bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold text-xs py-2.5 shadow-md shadow-cyan-600/30 transition-all tracking-wide",
              footerActionLink: "text-cyan-400 hover:text-cyan-300 text-xs font-semibold",
              identityPreviewText: "text-slate-300 font-medium",
              identityPreviewEditButton: "text-cyan-400 hover:text-cyan-300",
            },
            variables: {
              colorPrimary: "#06b6d4",
              colorBackground: "#0f172a",
              colorText: "#f8fafc",
              colorTextSecondary: "#94a3b8",
              colorInputBackground: "#020617",
              colorInputText: "#f8fafc",
            },
          }}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
        />
      </div>

      {/* Security footer notice */}
      <div className="relative z-10 mt-8 flex items-center gap-2 text-[11px] text-slate-500 font-mono">
        <Cpu className="h-3.5 w-3.5 text-slate-600" />
        <span>GMDA / ASSAM SDMA TACTICAL PROTOCOL • ENCRYPTED SESSION</span>
      </div>
    </div>
  );
}
