import { z } from 'zod';
import { createServerFn } from '@tanstack/react-start';
import type { IUser } from '~/interfaces/api/IUser.ts';
import type { IApiResult } from '~/interfaces/api/IApiResult.ts';
import { useAppSession } from '~/server/api/Session.ts';

const AuthenticateSchema = z.object({
  language: z.string(),
  userId: z.string(),
});

export type AuthenticateInput = z.infer<typeof AuthenticateSchema>;

export const authRequest = createServerFn({ method: 'POST' })
  .inputValidator(AuthenticateSchema)
  .handler(async ({ data }): Promise<IApiResult<IUser>> => {
    const session = await useAppSession();

    // Return early if we already have a valid session
    const { userId } = session.data;
    if (userId) {
      const userName = `User-${userId}`;
      return { data: { userName } };
    }

    // Create session
    await session.update({
      userId: data.userId,
      accessToken: `${data.userId}-access-token`,
    });

    // Remove tokens and return
    const userName = `User-${data.userId}`;
    return { data: { userName } };
  });

export const logoutRequest = createServerFn({ method: 'POST' })
  .handler(async (): Promise<void> => {
    const session = await useAppSession();
    await session.clear();
  });
