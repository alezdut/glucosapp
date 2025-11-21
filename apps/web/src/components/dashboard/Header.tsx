"use client";

import { useAuth } from "@/contexts/auth-context";
import { Search, User } from "lucide-react";
import { usePathname } from "next/navigation";
import { NotificationDropdown } from "./NotificationDropdown";

export const Header = () => {
  const { user } = useAuth();
  const pathname = usePathname();
  const isPatientsPage = pathname === "/dashboard/patients";

  const userInitials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() ||
      user.email[0].toUpperCase()
    : "U";

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
        <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
          <User className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
          {userInitials}
        </div>
      </div>
    </header>
  );
};
