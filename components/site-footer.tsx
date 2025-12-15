import { CrafterStationLogo } from "@/components/logos/crafter-station";
import { GithubLogoThemeAware } from "@/components/logos/github-theme-aware";
import { MoralejaDesignLogo } from "@/components/logos/moraleja-design";
import { cn } from "@/lib/utils";
import { MoralejaLogo } from "./logos/moraleja";
import { PlusIcon } from "lucide-react";

const footerGridPattern = cn(
  "screen-line-before screen-line-after flex w-full before:z-1 after:z-1",
  "bg-[repeating-linear-gradient(315deg,var(--pattern-foreground)_0,var(--pattern-foreground)_1px,transparent_0,transparent_50%)] bg-size-[10px_10px] [--pattern-foreground:var(--color-edge)]/56",
);

export function SiteFooter() {
  return (
    <footer className="max-w-screen overflow-x-hidden px-2">
      <div className="screen-line-before mx-auto border-x border-edge md:max-w-3xl">
        <div className={footerGridPattern}>
          <div className="mx-auto flex items-center justify-center gap-3 border-x border-edge bg-background px-4 h-16 border-t ">
            <a
              className="flex items-center transition-colors hover:opacity-80"
              href="https://crafterstation.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <CrafterStationLogo className="size-5" />
              <span className="sr-only">Crafter Station</span>
            </a>

            <PlusIcon className="size-3" />

            <a
              className="flex items-center transition-colors hover:opacity-80"
              href="https://www.behance.net/behappy15"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MoralejaLogo className="-mx-2" />
              <span className="sr-only">Moraleja</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
