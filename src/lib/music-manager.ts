import { glob } from "glob";
import * as fs from "node:fs";
import * as mm from "music-metadata";
import { config, coverPath } from "../config.js";
import type { LoadedTracks } from "../server/types.js";
import * as path from "node:path";
import { logger } from "./logger.js";

const SUPPORTED_EXTENSIONS = [".mp3", ".flac", ".wav", ".ogg"];
const GLOB_PATTERN = `${config.musicPath}/**/*.{${SUPPORTED_EXTENSIONS.map((ext) => ext.slice(1)).join(",")}}`;

const saveCover = async (pics: mm.IPicture[] | undefined, coverId: string) => {
  const cover = mm.selectCover(pics);
  if (!cover) {
    return;
  }
  await fs.promises.writeFile(`${coverPath}/${coverId}`, cover.data);
};

export const loadTracks = async (
  getCoverId: (trackAlbum: string) => string,
  onOneTrackLoaded?: (
    metadata: TOnOneLoadedTrackParams,
    loadingState: LoadedTracks,
  ) => Promise<void>,
) => {
  const tracks = await glob(GLOB_PATTERN, { nodir: true, stat: true });

  const processTrackPromises = tracks.map(async (track, index) => {
    try {
      const { common } = await mm.parseFile(track!);

      await onOneTrackLoaded?.(common, {
        current: index + 1,
        total: tracks.length,
      });

      // TODO: you know what to do here
      await saveCover(
        common.picture,
        getCoverId(common.album || path.basename(track!)),
      );
      return common;
    } catch (error) {
      await logger.error(
        `Error loading track at ${track}: \n${(error as Error).message}`,
      );

      throw new Error(
        `Error loading track at ${track}: ${(error as Error).message}`,
      );
    }
  });

  return Promise.all(processTrackPromises).then(async () => {
    console.log("All tracks loaded");
  });
};

export type TOnOneLoadedTrackParams = mm.IAudioMetadata["common"];
