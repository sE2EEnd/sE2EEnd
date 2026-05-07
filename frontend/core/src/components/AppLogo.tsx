import { useTheme } from '@/contexts/ThemeContext';
import { useDarkMode } from '@/contexts/DarkModeContext';

interface AppLogoProps {
  imgClassName?: string;
  textClassName?: string;
}

export default function AppLogo({ imgClassName = 'h-10 rounded', textClassName = 'text-2xl font-bold text-white tracking-tight' }: AppLogoProps) {
  const { theme } = useTheme();
  const { isDark } = useDarkMode();

  const logoUrl = isDark ? theme?.logoUrlDark : theme?.logoUrl;

  if (logoUrl) {
    return <img src={logoUrl} alt={theme!.appName} className={imgClassName} />;
  }

  return <h1 className={textClassName}>{theme?.appName}</h1>;
}