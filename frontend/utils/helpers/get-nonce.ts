import { headers } from 'next/headers';

export const getNonce = async () => {
  const headersList = await headers();
  return headersList.get('X-Nonce');
};
