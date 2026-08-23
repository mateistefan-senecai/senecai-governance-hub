"use client";

import { useState } from "react";
import { Button } from "./button";
import { NoticeBar } from "./notice-bar";

/** For actions with no real destination yet (Generate dossier, Download report) — fires a local notice. */
export function StubActionButton({
  label,
  notice,
  variant = "ghost",
  size = "sm",
  className,
}: {
  label: string;
  notice: string;
  variant?: "primary" | "ink" | "ghost";
  size?: "md" | "sm";
  className?: string;
}) {
  const [shown, setShown] = useState(false);
  return (
    <>
      <Button type="button" variant={variant} size={size} className={className} onClick={() => setShown(true)}>
        {label}
      </Button>
      {shown && (
        <div className="fixed inset-x-0 top-0 z-50">
          <NoticeBar message={notice} onDismiss={() => setShown(false)} />
        </div>
      )}
    </>
  );
}
