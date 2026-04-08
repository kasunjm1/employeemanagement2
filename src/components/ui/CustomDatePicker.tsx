import React from 'react';
import { Calendar, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface CustomDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  className?: string;
  containerClassName?: string;
  required?: boolean;
  placeholder?: string;
  hideIcon?: boolean;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  onClear,
  className,
  containerClassName,
  required,
  placeholder = "YYYY-MM-DD",
  hideIcon = false
}) => {
  return (
    <div className={cn("relative w-full group", containerClassName)}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={cn(
            "w-full bg-surface-container-low border-none rounded-xl py-3 px-4 font-body text-sm focus:ring-2 focus:ring-primary transition-all",
            !hideIcon && (onClear && value ? "pr-20" : "pr-10"),
            className
          )}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {!hideIcon && (
            <div className="relative w-8 h-8 flex items-center justify-center">
              <Calendar size={18} className="text-on-surface-variant group-hover:text-primary transition-colors pointer-events-none" />
              <input
                type="date"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer [color-scheme:light]"
                tabIndex={-1}
              />
            </div>
          )}
          {onClear && value && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClear();
              }}
              className="p-1 text-on-surface-variant hover:text-primary transition-colors"
              title="Clear date"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
