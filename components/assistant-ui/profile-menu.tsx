"use client";

import {
  CircleHelp,
  Languages,
  LogOut,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type FC } from "react";
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

const BRAND_GRADIENT = "from-[#177e89] to-[#8fd9c8] bg-gradient-to-br";

const LANGUAGE_STORAGE_KEY = "pixelspace.language";

const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "ms", label: "Bahasa Melayu" },
] as const;

type LanguageId = (typeof LANGUAGES)[number]["id"];

type MenuLink = {
  id: string;
  label: string;
  Icon: LucideIcon;
  href: string;
};

const MENU_LINKS: MenuLink[] = [
  { id: "profile", label: "Profile", Icon: User, href: "/profile" },
  { id: "settings", label: "Settings", Icon: Settings, href: "/settings" },
  { id: "help", label: "Help & support", Icon: CircleHelp, href: "/help" },
];

export const ProfileMenu: FC = () => {
  const [language, setLanguage] = useState<LanguageId>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "en" || stored === "ms") setLanguage(stored);
  }, []);

  const changeLanguage = (value: LanguageId) => {
    setLanguage(value);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, value);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
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
            <span className="truncate text-sm font-medium">Guest</span>
            <span className="text-muted-foreground truncate text-xs">
              Not signed in
            </span>
          </div>
        </div>

        <DropdownMenuSeparator />

        {MENU_LINKS.map(({ id, label, Icon, href }) => (
          <DropdownMenuItem
            key={id}
            render={<a href={href} />}
            className="gap-2"
          >
            <Icon className="size-4" />
            {label}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2">
            <Languages className="size-4" />
            Language
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44">
            <DropdownMenuRadioGroup
              value={language}
              onValueChange={(value) => changeLanguage(value as LanguageId)}
            >
              {LANGUAGES.map(({ id, label }) => (
                <DropdownMenuRadioItem key={id} value={id}>
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          render={<a href="/login" />}
          className="gap-2"
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
