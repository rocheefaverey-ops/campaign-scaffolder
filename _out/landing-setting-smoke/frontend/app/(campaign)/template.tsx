'use client';

import type { ReactNode } from 'react';
import PageTransition from '@components/_core/Layout/PageTransition';

export default function Template({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
