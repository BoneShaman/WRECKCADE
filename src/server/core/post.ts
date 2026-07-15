import { EntrypointHeight, reddit } from '@devvit/web/server';

export const createPost = async () => {
  return await reddit.submitCustomPost({
    title: 'RAMAGEDDON: Daily Wreckpile',
    entry: 'default',
    textFallback: {
      text: 'Choose a crew, wreck the daily arena, and build the community scrap pile in RAMAGEDDON.',
    },
    styles: {
      backgroundColor: '#121820FF',
      backgroundColorDark: '#080B10FF',
      height: EntrypointHeight.TALL,
    },
  });
};
