"use client";

import { useAuth } from "@/contexts/auth-context";
import { LogOut, Search, ChevronDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NotificationDropdown } from "./NotificationDropdown";

export const Header = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPatientsPage = pathname === "/dashboard/patients";
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const userInitials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() ||
      user.email[0].toUpperCase()
    : "U";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
      setIsUserMenuOpen(false);
    }
  };

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10">
      {!isPatientsPage && (
        <div className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              placeholder="Search patients..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 ml-auto">
        <NotificationDropdown />
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((current) => !current)}
            className="flex items-center gap-3 rounded-full border border-gray-200 bg-white pl-2 pr-3 py-1.5 text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            aria-haspopup="menu"
            aria-expanded={isUserMenuOpen}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white font-semibold">
              {userInitials}
            </span>
            <span className="hidden sm:flex flex-col items-start leading-tight">
              <span className="text-sm font-medium text-gray-900">
                {user?.firstName || user?.email || "Usuario"}
              </span>
              <span className="text-xs text-gray-500">{user?.email}</span>
            </span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-2 shadow-lg">
              <div className="border-b border-gray-100 px-4 py-3 sm:hidden">
                <p className="text-sm font-medium text-gray-900">{user?.firstName || "Usuario"}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogOut className="w-4 h-4" />
                {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
