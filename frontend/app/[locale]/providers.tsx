'use client';

import { AppProgressBar as ProgressBar } from 'next-nprogress-bar';

type Props = {
  children: React.ReactNode;
};

const Providers: React.FC<Props> = ({ children }) => (
  <>
    {children}
    <ProgressBar height="4px" color="#000000" options={{ showSpinner: false }} shallowRouting />
  </>
);

export default Providers;
