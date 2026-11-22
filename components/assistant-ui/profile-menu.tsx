"use client";

import {
  Help as CircleHelp,
  Language as Languages,
  Logout as LogOut,
  Person as User,
  Settings,
  DarkMode,
  LightMode,
} from "@material-symbols-svg/react/rounded";
import { type FC } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { signOut, useSession } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n, type Language } from "@/lib/i18n";

const BRAND_GRADIENT = "from-[#177e89] to-[#8fd9c8] bg-gradient-to-br";

const LANGUAGES: { id: Language; key: "language.en" | "language.ms" }[] = [
  { id: "en", key: "language.en" },
  { id: "ms", key: "language.ms" },
];

const MENU_LINKS: {
  id: string;
  key: "profile.profile" | "profile.settings" | "profile.help";
  Icon: typeof User;
  href: string;
}[] = [
  { id: "profile", key: "profile.profile", Icon: User, href: "/profile" },
  {
    id: "settings",
    key: "profile.settings",
    Icon: Settings,
    href: "/settings",
  },
  { id: "help", key: "profile.help", Icon: CircleHelp, href: "/help" },
];

export const ProfileMenu: FC<{ showAppearance?: boolean }> = ({
  showAppearance = false,
}) => {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { data: session } = useSession();
  const { language, setLanguage, t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("profile.accountMenu")}
        className={`${BRAND_GRADIENT} focus-visible:ring-ring size-8 shrink-0 cursor-pointer rounded-full opacity-80 transition-opacity outline-none hover:opacity-100 focus-visible:ring-2`}
      />
      <DropdownMenuContent
        align="start"
        side="right"
        sideOffset={8}
        className="w-60"
      >
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className={`${BRAND_GRADIENT} size-9 shrink-0 rounded-full`} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">
              {session?.user?.name ?? t("profile.account")}
            </span>
            <span className="text-muted-foreground truncate text-xs">
              {session?.user?.email ?? ""}
            </span>
          </div>
        </div>

        <DropdownMenuSeparator />

        {MENU_LINKS.map(({ id, key, Icon, href }) => (
          <DropdownMenuItem
            key={id}
            render={<a href={href} />}
            className="gap-2"
          >
            <Icon className="size-4" />
            {t(key)}
          </DropdownMenuItem>
        ))}

        {showAppearance ? (
          <DropdownMenuItem
            className="gap-2"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
          >
            {resolvedTheme === "dark" ? (
              <LightMode className="size-4" />
            ) : (
              <DarkMode className="size-4" />
            )}
            {t(resolvedTheme === "dark" ? "shell.lightMode" : "shell.darkMode")}
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2">
            <Languages className="size-4" />
            {t("profile.language")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44">
            <DropdownMenuRadioGroup
              value={language}
              onValueChange={(value) => setLanguage(value as Language)}
            >
              {LANGUAGES.map(({ id, key }) => (
                <DropdownMenuRadioItem key={id} value={id}>
                  {t(key)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          className="gap-2"
          onClick={() => {
            void signOut().then(() => router.push("/"));
          }}
        >
          <LogOut className="size-4" />
          {t("profile.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
