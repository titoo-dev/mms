import { musicLibrary } from "~~/lib/music-manager";

export default defineEventHandler(async () => {
  const { shouldReload, currentHash } = await musicLibrary.shouldReloadTracks();

  if (shouldReload) {
  for await (const metadata of musicLibrary.loadTracks()) {
    musicLibrary.emit("trackLoaded", metadata);
  }
  await musicLibrary.updateDirectoryHash(currentHash);
  }

  return {
    error: null,
    data: shouldReload,
    success: true,
  };
});
