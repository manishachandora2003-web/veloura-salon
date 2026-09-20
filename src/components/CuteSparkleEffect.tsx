import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

export interface ParticleItem {
  id: string;
  x: number;
  y: number;
  icon: string;
  size: number;
  delayMs: number;
  offsetX: number;
}

interface CuteAnimationContextType {
  triggerCuteSparkle: (event?: React.MouseEvent<any> | { clientX: number; clientY: number } | null, label?: string) => void;
}

const CuteAnimationContext = createContext<CuteAnimationContextType>({
  triggerCuteSparkle: () => {},
});

export const useCuteSparkle = () => useContext(CuteAnimationContext);

export const CuteAnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [particles, setParticles] = useState<ParticleItem[]>([]);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  const triggerCuteSparkle = useCallback((event?: React.MouseEvent<any> | { clientX: number; clientY: number } | null) => {
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    if (event && 'clientX' in event && typeof event.clientX === 'number') {
      x = event.clientX;
      y = event.clientY;
    }

    const timestamp = Date.now();
    // Cute micro symbols: 🎀 tiny bow, ✨ sparkles, 💕 heart sparkles, 🌸 blossom
    const symbols = ['🎀', '✨', '💕', '🌸', '✨'];
    const newBatch: ParticleItem[] = symbols.map((icon, idx) => ({
      id: `${timestamp}-${idx}-${Math.random()}`,
      x,
      y,
      icon,
      size: icon === '🎀' ? 17 : icon === '💕' ? 14 : 13,
      delayMs: idx * 45,
      offsetX: (idx - 2) * 16 + (Math.random() * 8 - 4),
    }));

    setParticles((prev) => [...prev.slice(-12), ...newBatch]);

    // Cleanup after 850ms
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newBatch.some((nb) => nb.id === p.id)));
    }, 900);
  }, []);

  return (
    <CuteAnimationContext.Provider value={{ triggerCuteSparkle }}>
      {children}

      {/* Micro particle layer */}
      {!prefersReducedMotion && particles.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-9999 overflow-hidden">
          {particles.map((p) => (
            <span
              key={p.id}
              className="absolute animate-cute-particle select-none drop-shadow-xs"
              style={{
                left: `${p.x + p.offsetX}px`,
                top: `${p.y - 10}px`,
                fontSize: `${p.size}px`,
                animationDelay: `${p.delayMs}ms`,
                lineHeight: 1,
              }}
            >
              {p.icon}
            </span>
          ))}
        </div>
      )}
    </CuteAnimationContext.Provider>
  );
};
