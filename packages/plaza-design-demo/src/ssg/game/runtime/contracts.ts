export interface GameHost {
  /** Optional fixed presentation supplied by an embedding editor; ordinary play remains responsive. */
  viewport?:import('./frame').FrameViewport;
  initialCamera?:{scene:string;x:number;h:number};
  windowEl: HTMLElement;
  header: HTMLElement;
  footer: HTMLElement;
  inputHost: HTMLElement;
  onExit: () => void;
  setNodes: (n: number) => void;
  setScene: (text: string) => void;
}
