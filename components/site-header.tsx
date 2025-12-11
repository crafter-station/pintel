"use client";

import Link from "next/link";
import { AuthButtons } from "@/components/auth-buttons";
import { DesktopNav } from "@/components/desktop-nav";
import { MobileNav } from "@/components/mobile-nav";
import { ToggleTheme } from "@/components/toggle-theme";
import { MAIN_NAV } from "@/config/site";
import { cn } from "@/lib/utils";
import { SiteHeaderWrapper } from "./site-header-wrapper";

const headerWrapperClasses = cn(
	"sticky top-0 z-50 max-w-screen overflow-x-hidden bg-background px-2 pt-2",
	"data-[affix=true]:shadow-[0_0_16px_0_black]/8 dark:data-[affix=true]:shadow-[0_0_16px_0_black]/80",
	"not-dark:data-[affix=true]:**:data-header-container:after:bg-border",
	"transition-shadow duration-300",
);

const headerContainerClasses = cn(
	"screen-line-before screen-line-after mx-auto flex h-12 items-center justify-between gap-2 border-x border-edge px-2 after:z-1 after:transition-[background-color] sm:gap-4 md:max-w-3xl",
);

export function SiteHeader() {
	return (
		<SiteHeaderWrapper className={headerWrapperClasses}>
			<div className={headerContainerClasses} data-header-container>
				<Link href="/" className="flex items-center gap-2" aria-label="Home">
					<span className="text-lg font-bold">pintel</span>
				</Link>

				<div className="flex-1" />

				<DesktopNav items={MAIN_NAV} />

				<div className="flex items-center gap-2">
					<ToggleTheme />
					<AuthButtons />
					<MobileNav className="sm:hidden" items={MAIN_NAV} />
				</div>
			</div>
		</SiteHeaderWrapper>
	);
}
