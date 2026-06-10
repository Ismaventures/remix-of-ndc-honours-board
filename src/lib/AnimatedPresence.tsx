import { useRef, useState, useEffect, useCallback, type ReactNode, type ReactElement, Children, isValidElement } from "react";

interface AnimatedPresenceProps {
  children: ReactNode;
  mode?: "wait" | "popLayout" | "sync";
  initial?: boolean;
  custom?: unknown;
}

interface ChildEntry {
  key: string;
  element: ReactElement;
  state: "entering" | "entered" | "exiting";
}

function childKey(child: ReactNode): string {
  if (isValidElement(child) && child.key != null) return String(child.key);
  return "__default";
}

export function AnimatedPresence({
  children,
  mode = "sync",
  initial = true,
}: AnimatedPresenceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [entries, setEntries] = useState<ChildEntry[]>([]);
  const prevChildren = useRef<ReactNode>(children);

  const currentKeys = new Set<string>();
  const childArray = Children.toArray(children);

  const buildEntries = useCallback(
    (nextChildren: ReactNode) => {
      const next = Children.toArray(nextChildren);
      const nextKeys = new Set(next.map(childKey));
      const prevKeys = new Map(entries.map((e) => [e.key, e]));

      const merged: ChildEntry[] = [];

      if (mode === "wait") {
        const exiting = entries.filter((e) => !nextKeys.has(e.key) && e.state !== "exiting");
        if (exiting.length > 0 && nextKeys.size > 0) {
          for (const e of entries) {
            if (!nextKeys.has(e.key)) {
              merged.push({ ...e, state: "exiting" });
            } else {
              merged.push({ ...e, state: "entered" });
            }
          }
          for (const child of next) {
            const k = childKey(child);
            if (!prevKeys.has(k)) {
              merged.push({ key: k, element: child as ReactElement, state: "pending-enter" });
            }
          }
          return merged;
        }
        for (const e of entries) {
          if (nextKeys.has(e.key)) {
            merged.push({ ...e, state: "entered" });
          }
        }
        for (const child of next) {
          const k = childKey(child);
          if (!prevKeys.has(k)) {
            merged.push({
              key: k,
              element: child as ReactElement,
              state: initial ? "entered" : "entering",
            });
          }
        }
        return merged;
      }

      for (const e of entries) {
        if (nextKeys.has(e.key)) {
          merged.push({ ...e, state: "entered" });
        } else if (e.state !== "exiting") {
          merged.push({ ...e, state: "exiting" });
        } else {
          merged.push(e);
        }
      }
      for (const child of next) {
        const k = childKey(child);
        if (!prevKeys.has(k)) {
          merged.push({
            key: k,
            element: child as ReactElement,
            state: initial ? "entered" : "entering",
          });
        }
      }
      return merged;
    },
    [entries, mode, initial],
  );

  useEffect(() => {
    setEntries(buildEntries(children));
    prevChildren.current = children;
  }, [children, buildEntries]);

  const handleAnimationEnd = useCallback((key: string) => {
    setEntries((prev) => {
      const exiting = prev.filter((e) => e.key === key);
      if (exiting.length === 0) return prev;
      const updated = prev.map((e) =>
        e.key === key ? { ...e, state: "entered" as const } : e,
      );
      if (exiting[0].state === "exiting") {
        return prev.filter((e) => e.key !== key);
      }
      if (exiting[0].state === "entering") {
        return prev.map((e) => (e.key === key ? { ...e, state: "entered" as const } : e));
      }
      return updated;
    });
  }, []);

  const getClassName = (entry: ChildEntry): string => {
    switch (entry.state) {
      case "entering":
        return "animate-fade-in";
      case "exiting":
        return "animate-fade-out";
      default:
        return "";
    }
  };

  return (
    <div ref={containerRef} className="contents">
      {entries.map((entry) => (
        <PresenceChild
          key={entry.key}
          entryKey={entry.key}
          state={entry.state}
          className={getClassName(entry)}
          onAnimationEnd={handleAnimationEnd}
        >
          {entry.element}
        </PresenceChild>
      ))}
    </div>
  );
}

function PresenceChild({
  entryKey,
  state,
  className,
  onAnimationEnd,
  children,
}: {
  entryKey: string;
  state: string;
  className: string;
  onAnimationEnd: (key: string) => void;
  children: ReactNode;
}) {
  return (
    <div
      className={state === "entering" || state === "exiting" ? className : undefined}
      style={state === "entering" || state === "exiting" ? { animationFillMode: "forwards" } : undefined}
      onAnimationEnd={() => onAnimationEnd(entryKey)}
    >
      {children}
    </div>
  );
}
