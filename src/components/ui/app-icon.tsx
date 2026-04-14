import type { LucideProps } from "lucide-react";
import {
  Bell,
  Box,
  Building2,
  Calculator,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Factory,
  Gamepad2,
  LayoutDashboard,
  LoaderCircle,
  Lock,
  LogOut,
  Maximize,
  Menu,
  Package,
  ReceiptText,
  Scale,
  Search,
  Settings,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

const ICONS = {
  calculate: Calculator,
  chevron_left: ChevronLeft,
  chevron_right: ChevronRight,
  close: X,
  domain: Building2,
  factory: Factory,
  fullscreen: Maximize,
  gamepad: Gamepad2,
  groups: Users,
  help_center: CircleHelp,
  inventory_2: Package,
  lock: Lock,
  logout: LogOut,
  menu: Menu,
  notifications: Bell,
  package_2: Box,
  precision_manufacturing: Factory,
  progress_activity: LoaderCircle,
  receipt_long: ReceiptText,
  scale: Scale,
  search: Search,
  settings: Settings,
  space_dashboard: LayoutDashboard,
  trending_up: TrendingUp,
  view_in_ar: Box,
} as const;

export type AppIconName = keyof typeof ICONS;

type AppIconProps = Omit<LucideProps, "ref"> & {
  name: string;
};

export function AppIcon({
  name,
  className,
  size = "1em",
  strokeWidth = 2,
  ...props
}: AppIconProps) {
  const Icon = ICONS[name as AppIconName] ?? CircleHelp;

  return (
    <Icon
      aria-hidden="true"
      className={className}
      size={size}
      strokeWidth={strokeWidth}
      {...props}
    />
  );
}
