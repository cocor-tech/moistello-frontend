import type { ElementType } from "react";
import {
  ArrowLeftRight,
  Bell,
  BookOpen,
  CircleDot,
  Contrast,
  FileText,
  Gauge,
  CircleQuestionMark,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Moon,
  PiggyBank,
  Settings,
  SlidersHorizontal,
  Sun,
  Type,
  User,
  Users,
  Wallet,
} from "lucide-react";

import { Routes } from "@/lib/constants";
import type { Density, FontSize, Theme } from "@/stores/ui-store";

/**
 * Commands are declared as inert data here and bound to router/store
 * callbacks in `useCommandCommands`. Keeping them side-effect free means the
 * registry is trivially testable and the search index never has to be
 * re-created just to run an action.
 */

/**
 * `ElementType` rather than lucide's `LucideIcon`: lucide-react v1 does not
 * export that type, and this accepts any icon component.
 */
export type CommandIcon = ElementType;

export type CommandGroupId = "recent" | "page" | "action";

export interface BaseCommand {
  /** Stable identity, also the key used to record recents. */
  id: string;
  label: string;
  group: CommandGroupId;
  icon: CommandIcon;
  /** Extra search terms that are not part of the visible label. */
  keywords?: string;
  /** Right-aligned affordance, e.g. a keyboard chord. */
  hint?: string;
}

export interface NavigationCommand extends BaseCommand {
  group: "page";
  href: string;
}

/** Store mutations the palette can trigger without a navigation. */
export interface SettingsActionApi {
  setTheme: (theme: Theme) => void;
  setDensity: (density: Density) => void;
  setFontSize: (size: FontSize) => void;
  logout: () => void;
}

export interface ActionCommandSpec extends BaseCommand {
  group: "action";
  apply: (api: SettingsActionApi) => void;
}

export const NAVIGATION_COMMANDS: readonly NavigationCommand[] = [
  { id: "page.dashboard", label: "Dashboard", group: "page", href: Routes.DASHBOARD, icon: LayoutDashboard, keywords: "home overview" },
  { id: "page.circles", label: "Circles", group: "page", href: Routes.CIRCLES, icon: CircleDot, keywords: "groups savings pools", hint: "G H" },
  { id: "page.circles.create", label: "New circle", group: "page", href: Routes.CREATE_CIRCLE, icon: CircleDot, keywords: "create start", hint: "C" },
  { id: "page.circles.saved", label: "Saved circles", group: "page", href: Routes.CIRCLES_SAVED, icon: CircleDot, keywords: "bookmarks favorites" },
  { id: "page.circles.organizing", label: "Circles I organize", group: "page", href: Routes.CIRCLES_ORGANIZING, icon: CircleDot, keywords: "organizer host" },
  { id: "page.circles.compare", label: "Compare circles", group: "page", href: Routes.CIRCLES_COMPARE, icon: CircleDot, keywords: "diff side by side" },
  { id: "page.savings", label: "Savings", group: "page", href: Routes.SAVINGS, icon: PiggyBank, keywords: "goals" },
  { id: "page.wallet", label: "Wallet", group: "page", href: Routes.WALLET, icon: Wallet, keywords: "balance funds", hint: "G W" },
  { id: "page.wallet.deposit", label: "Deposit", group: "page", href: Routes.WALLET_DEPOSIT, icon: ArrowLeftRight, keywords: "add funds top up" },
  { id: "page.wallet.transfer", label: "Transfer", group: "page", href: Routes.WALLET_TRANSFER, icon: ArrowLeftRight, keywords: "send money" },
  { id: "page.wallet.transactions", label: "Transactions", group: "page", href: Routes.WALLET_TRANSACTIONS, icon: FileText, keywords: "history ledger" },
  { id: "page.wallet.addresses", label: "Wallet addresses", group: "page", href: Routes.WALLET_ADDRESSES, icon: Wallet, keywords: "address book" },
  { id: "page.contributions", label: "Contributions", group: "page", href: Routes.CONTRIBUTIONS, icon: CircleDot, keywords: "history payments" },
  { id: "page.payouts", label: "Payouts", group: "page", href: Routes.PAYOUTS, icon: PiggyBank, keywords: "winnings receive" },
  { id: "page.communities", label: "Communities", group: "page", href: Routes.COMMUNITIES, icon: Users, keywords: "groups collectives" },
  { id: "page.people", label: "People", group: "page", href: Routes.PEOPLE, icon: User, keywords: "members directory" },
  { id: "page.reputation", label: "Reputation", group: "page", href: Routes.REPUTATION, icon: Gauge, keywords: "moiscore tier score" },
  { id: "page.governance", label: "Governance", group: "page", href: Routes.GOVERNANCE, icon: FileText, keywords: "voting proposals" },
  { id: "page.referrals", label: "Referrals", group: "page", href: Routes.REFERRALS, icon: Users, keywords: "invite friends" },
  { id: "page.profile", label: "Profile", group: "page", href: Routes.PROFILE, icon: User, keywords: "me account", hint: "G P" },
  { id: "page.notifications", label: "Notifications", group: "page", href: Routes.NOTIFICATIONS, icon: Bell, keywords: "alerts inbox", hint: "G N" },
  { id: "page.settings", label: "Settings", group: "page", href: Routes.PROFILE_SETTINGS, icon: Settings, keywords: "preferences options", hint: "G S" },
  { id: "page.settings.account", label: "Settings · Account", group: "page", href: Routes.SETTINGS_ACCOUNT, icon: Settings, keywords: "profile security password" },
  { id: "page.settings.privacy", label: "Settings · Privacy", group: "page", href: Routes.SETTINGS_PRIVACY, icon: SlidersHorizontal, keywords: "visibility leaderboard" },
  { id: "page.settings.notifications", label: "Settings · Notifications", group: "page", href: Routes.SETTINGS_NOTIFICATIONS, icon: Bell, keywords: "email push alerts" },
  { id: "page.settings.theme", label: "Settings · Theme", group: "page", href: Routes.SETTINGS_THEME, icon: Sun, keywords: "dark light appearance" },
  { id: "page.settings.language", label: "Settings · Language", group: "page", href: Routes.SETTINGS_LANGUAGE, icon: Type, keywords: "locale translation" },
  { id: "page.settings.payment", label: "Settings · Payment", group: "page", href: Routes.SETTINGS_PAYMENT, icon: Wallet, keywords: "payout methods" },
  { id: "page.settings.sessions", label: "Settings · Sessions", group: "page", href: Routes.SETTINGS_SESSIONS, icon: SlidersHorizontal, keywords: "devices active" },
  { id: "page.docs", label: "Documentation", group: "page", href: Routes.DOCS, icon: BookOpen, keywords: "guides manual" },
  { id: "page.support", label: "Support", group: "page", href: Routes.SUPPORT, icon: LifeBuoy, keywords: "help contact" },
  { id: "page.faq", label: "FAQ", group: "page", href: Routes.FAQ, icon: CircleQuestionMark, keywords: "questions answers" },
];

export const ACTION_COMMANDS: readonly ActionCommandSpec[] = [
  { id: "action.theme.light", label: "Theme: Light", group: "action", icon: Sun, keywords: "bright day", apply: (api) => api.setTheme("light") },
  { id: "action.theme.dark", label: "Theme: Dark", group: "action", icon: Moon, keywords: "night", apply: (api) => api.setTheme("dark") },
  { id: "action.theme.system", label: "Theme: Match system", group: "action", icon: Contrast, keywords: "auto os", apply: (api) => api.setTheme("system") },
  { id: "action.density.comfortable", label: "Density: Comfortable", group: "action", icon: SlidersHorizontal, keywords: "spacing roomy", apply: (api) => api.setDensity("comfortable") },
  { id: "action.density.compact", label: "Density: Compact", group: "action", icon: SlidersHorizontal, keywords: "spacing tight dense", apply: (api) => api.setDensity("compact") },
  { id: "action.font.small", label: "Text size: Small", group: "action", icon: Type, keywords: "font a11y", apply: (api) => api.setFontSize("small") },
  { id: "action.font.medium", label: "Text size: Medium", group: "action", icon: Type, keywords: "font default", apply: (api) => api.setFontSize("medium") },
  { id: "action.font.large", label: "Text size: Large", group: "action", icon: Type, keywords: "font a11y", apply: (api) => api.setFontSize("large") },
  { id: "action.logout", label: "Sign out", group: "action", icon: LogOut, keywords: "logout exit leave", apply: (api) => api.logout() },
];

/** Full searchable haystack for a command: label plus its hidden keywords. */
export function commandSearchText(command: BaseCommand): string {
  return command.keywords ? `${command.label} ${command.keywords}` : command.label;
}
