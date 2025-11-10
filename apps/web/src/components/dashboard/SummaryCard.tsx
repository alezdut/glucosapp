"use client";

interface SummaryCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
}

export const SummaryCard = ({
  title,
  value,
  description,
  icon: Icon,
  iconColor = "text-blue-500",
}: SummaryCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <Icon className={`w-12 h-12 ${iconColor}`} />
      </div>
    </div>
  );
};
