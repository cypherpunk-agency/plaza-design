import { useMemo } from 'react';

interface ParticlesProps {
  count?: number;
}

export function Particles({ count = 30 }: ParticlesProps) {
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
    <div id="particles" className="fixed inset-0 z-10 pointer-events-none">
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
