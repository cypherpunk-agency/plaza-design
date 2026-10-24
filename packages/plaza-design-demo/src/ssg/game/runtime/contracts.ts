export interface GameHost {
  windowEl: HTMLElement;
  header: HTMLElement;
  footer: HTMLElement;
  inputHost: HTMLElement;
  onExit: () => void;
  setNodes: (n: number) => void;
  setScene: (text: string) => void;
}
