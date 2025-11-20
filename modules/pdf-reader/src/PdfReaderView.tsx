import { requireNativeView } from 'expo';
import * as React from 'react';

import { PdfReaderViewProps } from './PdfReader.types';

const NativeView: React.ComponentType<PdfReaderViewProps> =
  requireNativeView('PdfReader');

export default function PdfReaderView(props: PdfReaderViewProps) {
  return <NativeView {...props} />;
}
