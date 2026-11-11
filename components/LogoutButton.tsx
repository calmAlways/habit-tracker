"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }
  return (
    <Button type="button" variant="ghost" size="icon" onClick={logout} aria-label="退出">
      <LogOut className="size-5" />
    </Button>
  );
}
