import { glob } from "glob";
import * as uuid from "uuid";
import * as fs from "node:fs";
import * as fh from "folder-hash";
import { logger } from "./logger.js";
import { basename } from "node:path";
import * as mm from "music-metadata";
import { prisma } from "$prisma/client.js";
import { config, coverPath } from "../config.js";
import type { LoadedTracks } from "../server/types.js";

class MusicLibraryManager {
  private readonly supportedExtensions = ["mp3", "flac", "wav", "ogg"];
  private readonly globPattern = `${config.musicPath}/**/*.{${this.supportedExtensions.join(",")}}`;

  async getCoverPath(
    pictures: mm.IPicture[] | undefined,
    albumId: string,
  ): Promise<string | null> {
    const cover = mm.selectCover(pictures);
    if (!cover) return null;

    const ext = cover.format.split("/")[1] ?? "jpg";
    const path = `${coverPath}/${albumId}.${ext}`;

    try {
      await fs.promises.access(path);
    } catch {
      await fs.promises.writeFile(path, cover.data);
    }
    return path;
  }

  async saveTrack(metadata: mm.IAudioMetadata["common"] & { path: string }) {
    const trackTitle = metadata.title || basename(metadata.path);
    const artists = (metadata.artist?.split(/,|, /g) ?? []).map((name) =>
      name.trim(),
    );

    const albumIdentifier = `${metadata.album ?? trackTitle}-${metadata.albumartist || "Various Artists"}`;
    const albumId = uuid.v5(albumIdentifier, uuid.v5.DNS);

    const existingAlbum = await prisma.album.findUnique({
      where: { id: albumId },
    });
    const coverPath =
      existingAlbum?.coverPath ||
      (metadata.picture
        ? await this.getCoverPath(metadata.picture, albumId)
        : null);

    const album = await prisma.album.upsert({
      where: { id: albumId },
      update: { coverPath: existingAlbum?.coverPath ? undefined : coverPath },
      create: {
        id: albumId,
        title: metadata.album || trackTitle,
        coverPath,
      },
    });

    const artistRecords = await Promise.all(
      artists.map((name) =>
        prisma.artist.upsert({
          where: { id: uuid.v5(`${name}-${albumId}`, uuid.v5.DNS) },
          update: {},
          create: {
            id: uuid.v5(`${name}-${albumId}`, uuid.v5.DNS),
            name,
            albums: { connect: { id: album.id } },
          },
        }),
      ),
    );

    const track = await prisma.track.findUnique({
      where: { path: metadata.path },
    });

    if (track) return track;

    return prisma.track.create({
      data: {
        title: trackTitle,
        path: metadata.path,
        album: { connect: { id: album.id } },
        artists: {
          connect: artistRecords.map((artist) => ({ id: artist.id })),
        },
      },
    });
  }

  async loadTracks(
    onProgress?: (
      metadata: LoadedMetadata,
      state: LoadedTracks,
    ) => Promise<void>,
  ) {
    const tracks = await glob(this.globPattern, { nodir: true, stat: true });

    return Promise.all(
      tracks.map(async (trackPath, index) => {
        try {
          const { common } = await mm.parseFile(trackPath);
          const metadata = { ...common, path: trackPath };

          await onProgress?.(metadata, {
            current: index + 1,
            total: tracks.length,
          });

          return common;
        } catch (error) {
          const message = `Error loading track at ${trackPath}: ${(error as Error).message}`;
          await logger.error(message);
          throw new Error(message);
        }
      }),
    );
  }

  async getDirectoryHash() {
    const { hash } = await fh.hashElement(config.musicPath);
    return hash;
  }
}

type LoadedMetadata = mm.IAudioMetadata["common"] & { path: string };

export const musicLibrary = new MusicLibraryManager();
