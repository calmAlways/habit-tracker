import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { buttonVariants } from "@/components/ui/button";
import { LayoutDashboard, BarChart3, Settings } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-md md:max-w-2xl px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-semibold">
            习惯追踪
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/" className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="今日">
              <LayoutDashboard className="size-5" />
            </Link>
            <Link href="/stats" className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="统计">
              <BarChart3 className="size-5" />
            </Link>
            <Link href="/settings" className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="设置">
              <Settings className="size-5" />
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-md md:max-w-2xl">{children}</div>
      </main>
    </div>
  );
}
