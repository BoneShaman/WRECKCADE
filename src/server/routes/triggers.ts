import { Hono } from 'hono';
import type {
  OnAppInstallRequest,
  OnAppUpgradeRequest,
  TriggerResponse,
} from '@devvit/web/shared';
import { context, redis } from '@devvit/web/server';
import { createPost } from '../core/post';

export const triggers = new Hono();

triggers.post('/on-app-install', async (c) => {
  try {
    const input = await c.req.json<OnAppInstallRequest | OnAppUpgradeRequest>();
    const subreddit = context.subredditName ?? 'unknown';
    // The rebrand needs one fresh WRECKCADE post on existing installations.
    // A dedicated marker preserves the original post record while keeping every
    // subsequent install/upgrade idempotent.
    const markerKey = `ramageddon:v1:install:wreckcade:${subreddit.toLowerCase()}`;
    const claim = `creating:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const claimed = await redis.set(markerKey, claim, {
      nx: true,
      expiration: new Date(Date.now() + 120_000),
    });
    if (!claimed) {
      const existingPostId = await redis.get(markerKey);
      return c.json<TriggerResponse>(
        {
          status: 'success',
          message: existingPostId?.startsWith('creating:')
            ? `WRECKCADE post creation is already in progress in ${subreddit} (trigger: ${input.type})`
            : `WRECKCADE post ${existingPostId ?? 'unknown'} already exists in ${subreddit} (trigger: ${input.type})`,
        },
        200
      );
    }

    try {
      const post = await createPost();
      await redis.set(markerKey, post.id);

      return c.json<TriggerResponse>(
        {
          status: 'success',
          message: `Post created in subreddit ${subreddit} with id ${post.id} (trigger: ${input.type})`,
        },
        200
      );
    } catch (error) {
      if ((await redis.get(markerKey)) === claim) await redis.del(markerKey);
      throw error;
    }
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<TriggerResponse>(
      {
        status: 'error',
        message: 'Failed to create post',
      },
      400
    );
  }
});
