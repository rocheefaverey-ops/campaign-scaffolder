import { NextResponse } from 'next/server';
import { apiMiddleware } from '@server/api-utils';

export const GET = apiMiddleware(async () => {
  return NextResponse.json({ message: 'Hello, World!' });
});
