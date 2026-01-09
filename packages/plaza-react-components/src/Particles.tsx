import { useMemo } from 'react';

export interface ParticlesProps {
  /** Number of particles to render */
  count?: number;
  /** Additional CSS class */
  className?: string;
}

/**
 * Floating particle effect component.
 * Renders animated particles using plaza-particle CSS classes.
 */
export function Particles({ count = 30, className = '' }: ParticlesProps) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const isCyan = Math.random() > 0.5;
      return {
        id: i,
        className: `plaza-particle plaza-particle--${isCyan ? 'cyan' : 'orange'}`,
        style: {
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 12}s`,
          animationDuration: `${10 + Math.random() * 8}s`,
          opacity: 0.4 + Math.random() * 0.4,
        },
      };
    });
  }, [count]);

  return (
    <div className={`plaza-particles ${className}`.trim()}>
      {particles.map((p) => (
        <div
          key={p.id}
          className={p.className}
          style={p.style}
        />
      ))}
    </div>
  );
}
