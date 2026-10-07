import {
  ArrowLeft, Bell, Building2, Calendar, CalendarDays, CalendarPlus, CalendarX, Check, ChevronRight, CircleCheck, CircleX,
  Clock, House, IdCard, Menu, MessageCircle, Minus, Moon, MapPin, Phone, Plus, ShieldCheck, Smile, Sparkles, Star, Stethoscope,
  Sun, TriangleAlert, User, X,
  type LucideIcon,
} from "lucide-react";

const ICONS = {
  "arrow-left": ArrowLeft, bell: Bell, "building-2": Building2, calendar: Calendar, "calendar-days": CalendarDays,
  "calendar-plus": CalendarPlus, "calendar-x": CalendarX, check: Check, "chevron-right": ChevronRight,
  "circle-check": CircleCheck, "circle-x": CircleX, clock: Clock, house: House, "id-card": IdCard, menu: Menu,
  "message-circle": MessageCircle, minus: Minus, moon: Moon, "map-pin": MapPin, phone: Phone, plus: Plus,
  "shield-check": ShieldCheck, smile: Smile, sparkles: Sparkles, star: Star, stethoscope: Stethoscope, sun: Sun,
  "triangle-alert": TriangleAlert, user: User, x: X,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

/** Icono de línea (Lucide). El nombre es tipado: añadir aquí los nuevos que se necesiten. */
export default function Icon({ name, size = 20, style, className }: { name: IconName; size?: number; style?: React.CSSProperties; className?: string }) {
  const C = ICONS[name];
  return <C size={size} strokeWidth={2} aria-hidden="true" style={{ flexShrink: 0, ...style }} className={className} />;
}
