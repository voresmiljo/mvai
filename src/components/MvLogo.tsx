import React from "react";

interface LogoProps {
  className?: string;
  variant?: "dark" | "light";
  size?: "sm" | "md" | "lg";
}

export function MvLogo({ className = "", variant = "dark", size = "md" }: LogoProps) {
  const isLight = variant === "light";
  
  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-11 h-11",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className={`flex items-center gap-2.5 font-bold tracking-tight select-none ${className}`}>
      {/* Minimalist Logo Icon: Leaf & Legal Paragraph / Compass geometric interplay */}
      <div
        className={`${iconSizes[size]} rounded-lg flex items-center justify-center font-mono font-bold transition-transform shadow-xs ${
          isLight
            ? "bg-white text-[#0F382C] border border-white/20"
            : "bg-[#0F382C] text-[#F7FAFA] border border-[#1A4332]"
        }`}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
        >
          {/* M stylized with environmental path / paragraph marker */}
          <path
            d="M6 24V9L12 17L18 9V24"
            stroke="currentColor"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* AI leaf/sparkle indicator */}
          <circle cx="24" cy="11" r="2.75" fill={isLight ? "#2E8B57" : "#4ade80"} />
          <path
            d="M24 16V23"
            stroke={isLight ? "#2E8B57" : "#4ade80"}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="flex flex-col leading-none">
        <span
          className={`font-extrabold ${textSizes[size]} ${
            isLight ? "text-white" : "text-[#0F382C]"
          }`}
        >
          MVAI<span className={isLight ? "text-emerald-400" : "text-[#2E8B57]"}>.dk</span>
        </span>
        <span
          className={`text-[10px] font-medium tracking-wider uppercase mt-0.5 ${
            isLight ? "text-slate-300" : "text-[#64748B]"
          }`}
        >
          Miljøvurderingsvejen
        </span>
      </div>
    </div>
  );
}
