/// <reference types="vite/client" />

declare module '*.md?raw' {
  const content: string;
  export default content;
}

declare module 'plaza-design-guide/*.md?raw' {
  const content: string;
  export default content;
}
