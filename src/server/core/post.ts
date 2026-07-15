import { EntrypointHeight, reddit } from '@devvit/web/server';

export const createPost = async () => {
  return await reddit.submitCustomPost({
    title: 'WRECKCADE: Daily Wreckpile',
    entry: 'default',
    textFallback: {
      text: 'Choose a crew, wreck the daily arena, and build the community scrap pile in WRECKCADE.',
    },
    styles: {
      backgroundColor: '#121820FF',
      backgroundColorDark: '#080B10FF',
      height: EntrypointHeight.TALL,
    },
  });
};
