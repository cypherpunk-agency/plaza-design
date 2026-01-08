import { useEffect, useRef } from 'react';
import { initGridCanvas, GridController } from '../plaza';

export function GridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<GridController | null>(null);

  useEffect(() => {
    const controller = initGridCanvas(canvasRef.current);
    controllerRef.current = controller;
    controller.start();

    return () => {
      controller.stop();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0"
    />
  );
}
