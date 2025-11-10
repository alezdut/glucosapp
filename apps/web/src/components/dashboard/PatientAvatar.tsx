"use client";

import Image from "next/image";
import { getActivityDotColor } from "@/utils/patient-utils";

interface PatientAvatarProps {
  avatarUrl?: string;
  patientName: string;
  activityStatus: "Activo" | "Inactivo";
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: {
    container: "w-16 h-16",
    text: "text-2xl",
    dot: "w-4 h-4",
    border: "border-2",
    width: 64,
    height: 64,
  },
  md: {
    container: "w-20 h-20",
    text: "text-3xl",
    dot: "w-5 h-5",
    border: "border-2",
    width: 80,
    height: 80,
  },
  lg: {
    container: "w-24 h-24",
    text: "text-4xl",
    dot: "w-6 h-6",
    border: "border-4",
    width: 96,
    height: 96,
  },
};

/**
 * PatientAvatar component - Displays patient avatar with activity status indicator
 */
export const PatientAvatar = ({
  avatarUrl,
  patientName,
  activityStatus,
  size = "md",
}: PatientAvatarProps) => {
  const sizes = sizeClasses[size];

  return (
    <div className="relative flex-shrink-0">
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={patientName}
          width={sizes.width}
          height={sizes.height}
          className={`${sizes.container} rounded-full object-cover`}
          loading="lazy"
        />
      ) : (
        <div
          className={`${sizes.container} rounded-full bg-gray-200 flex items-center justify-center`}
        >
          <span className={`${sizes.text} font-semibold text-gray-600`}>
            {patientName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      {/* Activity status indicator */}
      <div
        className={`${getActivityDotColor(activityStatus)} absolute bottom-0 right-0 ${sizes.dot} rounded-full ${sizes.border} border-white`}
      />
    </div>
  );
};
