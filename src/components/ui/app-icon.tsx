import type { LucideProps } from "lucide-react";
import {
  Award,
  Bell,
  BookOpen,
  Box,
  Building2,
  Calculator,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock,
  Crown,
  Factory,
  Flame,
  Gamepad2,
  Gift,
  Goal,
  LayoutDashboard,
  LoaderCircle,
  Lock,
  LogOut,
  Maximize,
  Medal,
  Menu,
  Package,
  ReceiptText,
  RotateCcw,
  Route,
  Scale,
  Scroll,
  Search,
  Settings,
  Shield,
  Star,
  Swords,
  Target,
  Timer,
  Trophy,
  TrendingUp,
  Users,
  Webcam,
  X,
  Zap,
} from "lucide-react";

const ICONS = {
  award: Award,
  calculate: Calculator,
  check: Check,
  check_circle: CheckCircle2,
  chevron_left: ChevronLeft,
  chevron_right: ChevronRight,
  clock: Clock,
  close: X,
  crown: Crown,
  domain: Building2,
  emoji_events: Trophy,
  factory: Factory,
  flame: Flame,
  fullscreen: Maximize,
  gamepad: Gamepad2,
  gift: Gift,
  goal: Goal,
  groups: Users,
  help_center: CircleHelp,
  inventory_2: Package,
  local_fire_department: Flame,
  lock: Lock,
  logout: LogOut,
  medal: Medal,
  menu: Menu,
  menu_book: BookOpen,
  military_tech: Medal,
  notifications: Bell,
  package_2: Box,
  precision_manufacturing: Factory,
  progress_activity: LoaderCircle,
  receipt_long: ReceiptText,
  rotate_ccw: RotateCcw,
  route: Route,
  scale: Scale,
  scroll: Scroll,
  search: Search,
  settings: Settings,
  shield: Shield,
  space_dashboard: LayoutDashboard,
  star: Star,
  swords: Swords,
  target: Target,
  timer: Timer,
  trending_up: TrendingUp,
  view_in_ar: Box,
  webcam: Webcam,
  zap: Zap,
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
