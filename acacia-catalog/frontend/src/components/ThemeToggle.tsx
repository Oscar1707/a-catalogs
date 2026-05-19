import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Toggle dark/light. Botón minimal sin background — solo cambia el icono
 * con transición suave. Coherente con el lenguaje "quiet" de la marca.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={isDark ? 'Tema claro' : 'Tema oscuro'}
      className="inline-flex h-8 w-8 items-center justify-center text-mute transition-colors hover:text-bone"
    >
      {isDark
        ? <Sun  size={16} strokeWidth={1.2} />
        : <Moon size={16} strokeWidth={1.2} />}
    </button>
  );
}
