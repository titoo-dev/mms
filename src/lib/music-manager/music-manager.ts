import { glob } from "glob";
import pLimit from "p-limit";
import * as fs from "node:fs";
import * as path from "node:path";
import * as mm from "music-metadata";
import * as crypto from "node:crypto";
import EventEmitter from "node:events";
import { logger } from "../logger.js";
import { config } from "../../config.js";
import { TrackSaver } from "./track-saver.js";
import { startWatcher } from "./watcher.js";
import { prisma } from "../../../prisma/client.js";
import { type LoadedTracks, StateKey } from "../../server/types.js";

class MusicLibraryManager extends EventEmitter {
  private readonly BATCH_SIZE = 50;
  private readonly trackSaver = new TrackSaver();
  private readonly supportedExtensions = ["mp3", "flac", "wav", "ogg"];
  private readonly globPattern = `${config.musicPath}/**/*.{${this.supportedExtensions.join(",")}}`;
  private watcherCleanup: (() => void) | null = null;

  /**
   * Initializes a new instance of MusicLibraryManager.
   */
  constructor() {
    super();
    this.initListeners();
  }

  /**
   * Initializes the file system watcher.
   * @returns {void}
   */
  initWatcher(): void {
    this.watcherCleanup = startWatcher();
  }

  /**
   * Sets up event listeners for track update and removal.
   * @returns {void}
   */
  private initListeners(): void {
    try {
      this.on("update", async (path: string) => {
        if (!this.isMusicFile(path)) return;
        await this.trackSaver.updateTrack(path);
      });

      this.on("remove", async (path: string) => {
        await this.trackSaver.removeTrack(path);
      });
    } catch {
      this.watcherCleanup?.();
    }
  }

  /**
   * Loads and yields track metadata in batches.
   * @returns {AsyncGenerator<LoadedMetadata>} - An async generator yielding track metadata.
   */
  async *loadTracks(): AsyncGenerator<LoadedMetadata> {
    const tracks = await glob(this.globPattern, { nodir: true, stat: true });
    const limit = pLimit(50);

    await this.trackSaver.deleteDeletedTracks(tracks);

    for (let i = 0; i < tracks.length; i += this.BATCH_SIZE) {
      const batch = tracks.slice(i, i + this.BATCH_SIZE);

      const metadataBatch = await Promise.all(
        batch.map((track) =>
          limit(async () => {
            try {
              const { common } = await mm.parseFile(track);
              const dateAdded = (await fs.promises.stat(track)).birthtime;

              return {
                ...common,
                dateAdded,
                path: track,
                state: {
                  current: i + batch.indexOf(track) + 1,
                  total: tracks.length,
                  done: i + batch.indexOf(track) === tracks.length - 1,
                },
              };
            } catch (error) {
              const message = `Error loading track at ${track}: ${(error as Error).message}`;
              await logger.error(message);
              throw new Error(message);
            }
          })
        )
      );

      await this.trackSaver.saveTracks(metadataBatch);

      for (const metadata of metadataBatch) {
        yield metadata;
      }
    }
  }

  /**
   * Recursively computes a SHA-256 hash of the music directory contents.
   * @returns {Promise<string>} - The computed hash as a hexadecimal string.
   */
  async getDirectoryHash(): Promise<string> {
    const hash = crypto.createHash("sha256");

    async function traverseDirectory(directory: string) {
      const entries = await fs.promises.readdir(directory, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
          await traverseDirectory(entryPath);
        } else {
          const stats = await fs.promises.stat(entryPath);
          hash.update(entryPath + stats.mtimeMs);
        }
      }
    }

    await traverseDirectory(config.musicPath);
    return hash.digest("hex");
  }

  /**
   * Reads and returns the cover image file contents.
   * @param {string} coverPath - The file path of the cover image.
   * @returns {Promise<Buffer>} - A promise resolving to the cover image data as a Buffer.
   */
  async getCover(coverPath: string): Promise<Buffer> {
    return fs.promises.readFile(coverPath);
  }

  /**
   * Checks if the provided path points to a supported music file.
   * @param {string} path - The file path to check.
   * @returns {boolean} - True if the file is a supported music file; otherwise, false.
   */
  private isMusicFile(path: string): boolean {
    return this.supportedExtensions.includes(path.split(".").pop()!);
  }

  /**
   * Determines whether tracks should be reloaded based on directory hash changes.
   * @returns {Promise<{ shouldReload: boolean; currentHash: string }>} - Object indicating if reload is needed and the current hash.
   */
  async shouldReloadTracks(): Promise<{ shouldReload: boolean; currentHash: string; }> {
    const storedHash = (
      await prisma.state.findUnique({
        where: { key: StateKey.DirectoryHash },
      })
    )?.value;
    const currentHash = await this.getDirectoryHash();
    return {
      shouldReload: storedHash !== currentHash,
      currentHash,
    };
  }

  /**
   * Reads and returns the audio file content.
   * @param {string} path - The file path of the audio.
   * @returns {Promise<Buffer>} - A promise resolving to the audio file data as a Buffer.
   */
  async getAudio(path: string): Promise<Buffer> {
    return await fs.promises.readFile(path);
  }
}

export type LoadedMetadata = mm.IAudioMetadata["common"] & {
  path: string;
  state: LoadedTracks;
  dateAdded: Date;
};

export const musicLibrary = new MusicLibraryManager();
