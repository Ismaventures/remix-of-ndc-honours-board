import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Commandant } from "@/types/domain";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCommandantDisplayTitle(
  commandant?: Pick<Commandant, "title" | "postNominals">,
  fallback = "Commandant record pending database data",
) {
  const title = commandant?.title?.trim() ?? "";
  const postNominals = commandant?.postNominals?.trim() ?? "";

  if (title && postNominals) {
    const sameText = title.localeCompare(postNominals, undefined, {
      sensitivity: "accent",
    }) === 0;

    return sameText ? title : `${title} • ${postNominals}`;
  }

  return postNominals || title || fallback;
}
