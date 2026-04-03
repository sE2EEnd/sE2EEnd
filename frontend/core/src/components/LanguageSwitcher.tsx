import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';
import 'flag-icons/css/flag-icons.min.css';

const languages = [
  { code: 'fr', name: 'Français', countryCode: 'fr' },
  { code: 'en', name: 'English', countryCode: 'gb' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm group"
      >
        <Globe className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
        <span className={cn("fi rounded-sm shadow-sm", `fi-${currentLanguage.countryCode}`)}></span>
        <span className="text-sm font-bold text-gray-700 uppercase tracking-tight">{currentLanguage.name}</span>
        <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform duration-200", isOpen ? "rotate-180" : "")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-[100] animate-in zoom-in-95 fade-in">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                lang.code === i18n.language 
                  ? "bg-primary/5 text-primary font-bold" 
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <span className={cn("fi rounded-sm", `fi-${lang.countryCode}`)}></span>
              <span className="flex-1 text-left">{lang.name}</span>
              {lang.code === i18n.language && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
