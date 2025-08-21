declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.css?content' {
  const content: string;
  export default content;
}
