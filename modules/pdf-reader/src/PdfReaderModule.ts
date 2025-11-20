import { NativeModule, requireNativeModule } from 'expo';

import { PdfReaderModuleEvents } from './PdfReader.types';

declare class PdfReaderModule extends NativeModule<PdfReaderModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<PdfReaderModule>('PdfReader');
