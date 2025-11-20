import * as React from 'react';

import { PdfReaderViewProps } from './PdfReader.types';

export default function PdfReaderView(props: PdfReaderViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
