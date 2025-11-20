// Reexport the native module. On web, it will be resolved to PdfReaderModule.web.ts
// and on native platforms to PdfReaderModule.ts
export { default } from './src/PdfReaderModule';
export { default as PdfReaderView } from './src/PdfReaderView';
export * from  './src/PdfReader.types';
