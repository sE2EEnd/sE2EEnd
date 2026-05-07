import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SecretTextareaProps {
  value: string;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
  readOnly?: boolean;
  hideText?: boolean;
  onHideTextChange?: (v: boolean) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
}

export default function SecretTextarea({
  value,
  onChange,
  readOnly = false,
  hideText: controlledHideText,
  onHideTextChange,
  rows = 6,
  placeholder,
  className,
}: SecretTextareaProps) {
  const [internalHideText, setInternalHideText] = useState(false);

  const isControlled = controlledHideText !== undefined;
  const hideText = isControlled ? controlledHideText : internalHideText;
  const toggleHideText = () => {
    const next = !hideText;
    if (isControlled) onHideTextChange?.(next);
    else setInternalHideText(next);
  };

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        rows={rows}
        placeholder={placeholder}
        className={cn(
          'w-full px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm resize-none',
          'dark:text-gray-100',
          readOnly
            ? 'bg-gray-50 dark:bg-gray-700 focus:outline-none'
            : 'bg-white dark:bg-gray-700 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent',
          hideText && '[filter:blur(4px)] select-none',
          className,
        )}
      />
      <button
        type="button"
        onClick={toggleHideText}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-white/80 dark:bg-gray-600/80 backdrop-blur-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-600 shadow-sm transition-all"
      >
        {hideText ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>
    </div>
  );
}