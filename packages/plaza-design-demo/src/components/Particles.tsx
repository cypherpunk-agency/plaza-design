import { Particles as PlazaParticles } from 'plaza-react-components';

interface ParticlesProps {
  count?: number;
}

export function Particles({ count = 30 }: ParticlesProps) {
  return <PlazaParticles count={count} className="fixed inset-0 z-10 pointer-events-none" />;
}
