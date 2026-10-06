// Markdown files are bundled as raw strings (see the asset/source rule in
// next.config.mjs).
declare module '*.md' {
  const content: string;
  export default content;
}
