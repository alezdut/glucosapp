"use client";

interface DashboardPeriodSelectorProps {
  selectedDays: number;
  onChange: (days: number) => void;
}

const PERIOD_OPTIONS = [
  { value: 7, label: "7 días" },
  { value: 15, label: "15 días" },
  { value: 30, label: "30 días" },
  { value: 90, label: "90 días" },
];

export const DashboardPeriodSelector = ({
  selectedDays,
  onChange,
}: DashboardPeriodSelectorProps) => {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 font-medium whitespace-nowrap">Período:</span>
      <div className="flex gap-2">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              selectedDays === option.value
                ? "bg-blue-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};
