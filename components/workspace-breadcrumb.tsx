"use client";

import { ChevronRight } from "lucide-react";

type BreadcrumbItem = { label: string; onSelect?: () => void };

export function WorkspaceBreadcrumb({
  items,
  label = "Caminho de navegação",
  disabled = false,
}: {
  items: BreadcrumbItem[];
  label?: string;
  disabled?: boolean;
}) {
  return (
    <nav className="workspace-breadcrumb" aria-label={label}>
      <ol>
        {items.map((item, index) => (
          <li key={index}>
            {index > 0 && <ChevronRight aria-hidden="true" className="size-3.5 shrink-0" />}
            {item.onSelect && index < items.length - 1 ? (
              <button type="button" disabled={disabled} onClick={item.onSelect} aria-label={`Voltar para ${item.label}`} title={item.label}>
                {item.label}
              </button>
            ) : (
              <span aria-current={index === items.length - 1 ? "page" : undefined} title={item.label}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
