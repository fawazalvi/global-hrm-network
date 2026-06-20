import {
  Users,
  Briefcase,
  Award,
  GraduationCap,
  Settings,
  ShieldCheck,
  LayoutDashboard,
  LogOut,
  User,
  PanelLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  Copy,
  CreditCard,
  File,
  MoreVertical,
  Truck,
  Users2,
  Bell,
  Home,
  LineChart,
  Package,
  Package2,
  ShoppingCart,
  Star,
  CircleUser,
  type LucideProps,
} from "lucide-react";

export const Icons = {
  logo: (props: LucideProps) => (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      fill="none"
    >
      {/* Globe Background Grid */}
      <circle cx="60" cy="60" r="48" stroke="#1E88E5" strokeWidth="2" opacity="0.4" />
      <path d="M 12,60 Q 60,82 108,60" stroke="#1E88E5" strokeWidth="1.2" opacity="0.3" />
      <path d="M 22,36 Q 60,54 98,36" stroke="#1E88E5" strokeWidth="1.2" opacity="0.3" />
      <path d="M 22,84 Q 60,102 98,84" stroke="#1E88E5" strokeWidth="1.2" opacity="0.3" />
      <path d="M 60,12 Q 36,60 60,108" stroke="#1E88E5" strokeWidth="1.2" opacity="0.3" />
      <path d="M 60,12 Q 84,60 60,108" stroke="#1E88E5" strokeWidth="1.2" opacity="0.3" />
      <path d="M 60,12 L 60,108" stroke="#1E88E5" strokeWidth="1.2" opacity="0.3" />

      {/* Human Figures */}
      {/* Left - Orange */}
      <circle cx="34" cy="48" r="6" fill="#FF7A00" />
      <path d="M 20,72 C 22,58 31,56 34,56 C 37,56 46,58 48,72 C 39,67 29,67 20,72 Z" fill="#FF7A00" />

      {/* Center - Green */}
      <circle cx="60" cy="42" r="7" fill="#4CAF50" />
      <path d="M 44,68 C 47,52 57,50 60,50 C 63,50 73,52 76,68 C 66,62 54,62 44,68 Z" fill="#4CAF50" />

      {/* Right - Blue */}
      <circle cx="86" cy="48" r="6" fill="#0F57D0" />
      <path d="M 72,72 C 74,58 83,56 86,56 C 89,56 98,58 100,72 C 91,67 81,67 72,72 Z" fill="#0F57D0" />

      {/* Orbit Ring */}
      <path d="M 10,88 C 30,108 90,108 110,88 C 90,95 30,95 10,88 Z" fill="#0D47A1" />
    </svg>
  ),
  google: (props: LucideProps) => (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10z"/><path d="M12 2v10l6 4"/>
    </svg>
  ),
  users: Users,
  briefcase: Briefcase,
  award: Award,
  graduationCap: GraduationCap,
  settings: Settings,
  shieldCheck: ShieldCheck,
  dashboard: LayoutDashboard,
  logout: LogOut,
  user: User,
  panelLeft: PanelLeft,
  search: Search,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  copy: Copy,
  creditCard: CreditCard,
  file: File,
  moreVertical: MoreVertical,
  truck: Truck,
  users2: Users2,
  bell: Bell,
  home: Home,
  lineChart: LineChart,
  package: Package,
  package2: Package2,
  shoppingCart: ShoppingCart,
  star: Star,
  circleUser: CircleUser,
};
