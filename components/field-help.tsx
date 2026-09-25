"use client";

import { useRef, useState } from "react";
import { CircleHelp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/** The same short explanation is available by hover, keyboard focus and touch. */
export function FieldHelp({ label, children }: { label: string; children: string }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            ref={trigger}
            type="button"
            aria-label={`Ajuda: ${label}`}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            onPointerDown={(event) => {
              // Preserve the current state until click, including on touch screens.
              event.preventDefault();
            }}
            onClick={(event) => {
              event.preventDefault();
              setOpen((current) => !current);
            }}
          >
            <CircleHelp size={15} aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          sideOffset={6}
          collisionPadding={16}
          className="z-[80] max-w-[min(18rem,calc(100vw-32px))] px-3 py-2 text-left text-sm leading-relaxed motion-reduce:animate-none"
          onEscapeKeyDown={(event) => event.stopPropagation()}
          onPointerDownOutside={(event) => {
            // A second tap is handled by the trigger; do not close and reopen it.
            if (trigger.current?.contains(event.target as Node)) event.preventDefault();
          }}
        >
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function HelpLabel({ label, htmlFor, children }: { label: string; htmlFor: string; children: string }) {
  return (
    <div className="mb-1 flex items-center gap-1">
      <label htmlFor={htmlFor} className="text-sm font-semibold">{label}</label>
      <FieldHelp label={label}>{children}</FieldHelp>
    </div>
  );
}
