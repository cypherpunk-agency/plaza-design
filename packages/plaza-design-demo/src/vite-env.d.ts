/// <reference types="vite/client" />

declare module '*.md?raw' {
  const content: string;
  export default content;
}

declare module '@design-guide/*.md?raw' {
  const content: string;
  export default content;
}
