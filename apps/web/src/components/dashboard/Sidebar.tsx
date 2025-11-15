"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, MessageSquare, Settings } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { colors } from "@glucosapp/theme";

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const menuItems: SidebarItem[] = [
  { label: "Inicio", href: "/dashboard", icon: Home },
  { label: "Pacientes", href: "/dashboard/patients", icon: Users },
  { label: "Comunicacion", href: "/dashboard/communication", icon: MessageSquare },
  { label: "Ajustes & Reportes", href: "/dashboard/settings", icon: Settings },
];

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="h-16 p-6 border-b border-gray-200 flex items-center">
        <div className="flex items-center gap-2">
          <BrandLogo size={40} color={colors.primary} />
          <h1 className="text-xl font-bold text-gray-900" aria-label="GlucosApp">
            GlucosApp
          </h1>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const IconComponent = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <IconComponent
                    className={`w-5 h-5 ${isActive ? "text-gray-900" : "text-gray-600"}`}
                  />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};
