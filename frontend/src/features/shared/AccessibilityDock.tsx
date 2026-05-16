import { useState, useRef, useEffect } from 'react';
import { Moon, Sun, Accessibility as AccessibilityIcon, Contrast, X, Settings } from 'lucide-react';
import { usePreferenceStore } from '../../lib/preference-store';

export default function AccessibilityDock() {
  const { theme, accessibility, highContrast, toggleTheme, toggleAccessibility, toggleHighContrast } = usePreferenceStore();
  const [dockOpen, setDockOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setDockOpen(false);
      }
    }
    if (dockOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dockOpen]);

  const toggleDock = () => {
    setDockOpen(!dockOpen);
  };

  return (
    <div ref={dockRef} className="fixed bottom-20 right-20 z-[9998] flex flex-col items-end gap-2">
      {/* Dock panel */}
      {dockOpen && (
        <div
          className="rounded-xl shadow-xl border p-2 flex flex-col gap-1.5 animate-fade-in"
          style={{
            backgroundColor: 'rgb(var(--color-surface))',
            borderColor: 'rgb(var(--color-border))',
          }}
          role="toolbar"
          aria-label="Accessibility controls"
        >
          <button
            type="button"
            onClick={() => { toggleTheme(); }}
            className="h-9 w-9 rounded-lg grid place-items-center transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => { toggleAccessibility(); }}
            className="h-9 w-9 rounded-lg grid place-items-center transition-colors"
            style={{
              backgroundColor: accessibility ? 'rgb(var(--color-primary-600))' : 'transparent',
              color: accessibility ? 'white' : 'rgb(var(--color-text-secondary))',
            }}
            onMouseEnter={(e) => { if (!accessibility) e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface-hover))'; }}
            onMouseLeave={(e) => { if (!accessibility) e.currentTarget.style.backgroundColor = 'transparent'; }}
            aria-pressed={accessibility}
            aria-label={accessibility ? 'Turn accessibility mode off' : 'Turn accessibility mode on'}
            title={accessibility ? 'Accessibility off' : 'Accessibility on'}
          >
            <AccessibilityIcon className="h-4 w-4" />
          </button>
          {accessibility && (
            <button
              type="button"
              onClick={() => { toggleHighContrast(); }}
              className="h-9 w-9 rounded-lg grid place-items-center transition-colors"
              style={{
                backgroundColor: highContrast ? 'rgb(var(--color-primary-600))' : 'transparent',
                color: highContrast ? 'white' : 'rgb(var(--color-text-secondary))',
              }}
              onMouseEnter={(e) => { if (!highContrast) e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface-hover))'; }}
              onMouseLeave={(e) => { if (!highContrast) e.currentTarget.style.backgroundColor = 'transparent'; }}
              aria-pressed={highContrast}
              aria-label={highContrast ? 'Turn high contrast off' : 'Turn high contrast on'}
              title={highContrast ? 'High contrast off' : 'High contrast on'}
            >
              <Contrast className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Toggle Button */}
      <button
        type="button"
        onClick={toggleDock}
        className="h-10 w-10 rounded-full shadow-lg border grid place-items-center transition-all duration-200 hover:scale-105"
        style={{
          backgroundColor: dockOpen ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-surface))',
          color: dockOpen ? 'white' : 'rgb(var(--color-text-secondary))',
          borderColor: 'rgb(var(--color-border))',
        }}
        aria-label={dockOpen ? 'Close accessibility menu' : 'Open accessibility menu'}
        aria-expanded={dockOpen}
        aria-haspopup="true"
        title="Accessibility"
      >
        {dockOpen ? <X className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
      </button>
    </div>
  );
}