"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  checked: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function CheckButton({ checked, onClick, disabled }: Props) {
  return (
    <Button
      type="button"
      size="icon"
      disabled={disabled}
      onClick={onClick}
      variant={checked ? "default" : "outline"}
      aria-label={checked ? "撤销打卡" : "打卡"}
      className="size-10 rounded-full"
    >
      <Check className="size-5" />
    </Button>
  );
}
