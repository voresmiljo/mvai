import React from "react";

interface LogoProps {
  className?: string;
  variant?: "dark" | "light";
  size?: "sm" | "md" | "lg";
}

export function MvLogo({ className = "", variant = "dark", size = "md" }: LogoProps) {
  const isLight = variant === "light";
  
  const iconSizes = {
    sm: "h-7 px-1.5 text-[13px]",
    md: "h-9 px-2 text-[15px]",
    lg: "h-11 px-2.5 text-[17px]",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className={`flex items-center gap-2.5 font-bold tracking-tight select-none ${className}`}>
      {/* mv combined with the section sign */}
      <div
        className={`${iconSizes[size]} rounded-lg flex items-center justify-center transition-transform shadow-xs ${
          isLight
            ? "bg-white text-[#0F382C] border border-white/20"
            : "bg-[#0F382C] text-[#F7FAFA] border border-[#1A4332]"
        }`}
      >
        <span className="font-extrabold leading-none tracking-tight" aria-hidden="true">
          mv
        </span>
        <span
          className={`ml-0.5 font-serif text-[1.25em] leading-none ${
            isLight ? "text-[#2E8B57]" : "text-[#86efac]"
          }`}
          aria-hidden="true"
        >
          §
        </span>
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
