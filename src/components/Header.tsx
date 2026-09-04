import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Link to="/" className="flex items-center gap-2">
          <Logo className="h-10 w-auto sm:h-12" />
        </Link>
        <div className="flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
