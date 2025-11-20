import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './PdfReader.types';

type PdfReaderModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class PdfReaderModule extends NativeModule<PdfReaderModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(PdfReaderModule, 'PdfReaderModule');
