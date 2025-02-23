import fs from "node:fs";
import * as uuid from "uuid";
import * as mm from "music-metadata";
import { basename } from "node:path";
import { coverPath } from "../../config.js";
import { prisma } from "../../../prisma/client.js";
import type { LoadedMetadata } from "./music-manager.js";

/**
 * Retrieves or creates the cover image file path for an album.
 * @param {mm.IPicture[] | undefined} pictures - Array of picture objects from metadata.
 * @param {string} albumId - The album identifier.
 * @returns {Promise<string | null>} - The cover image file path or null if no cover exists.
 */
export class TrackSaver {


  /**
   * Retrieves the cover image file path for an album, saving the cover image if it doesn't exist.
   * @param {mm.IPicture[] | undefined} pictures - Array of picture objects from metadata.
   * @param {string} albumId - The album identifier.
   * @returns {Promise<string | null>} - The cover image file path or null if no cover exists.
   */
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

  /**
   * Saves a batch of track metadata by grouping tracks by album and processing each album.
   * @param {LoadedMetadata[]} metadataBatch - Array of track metadata.
   * @returns {Promise<void>}
   */
  async saveTracks(metadataBatch: LoadedMetadata[]): Promise<void> {
    const tracksByAlbum = this.groupTracksByAlbum(metadataBatch);
    const albumPromises = tracksByAlbum.map(([albumIdentifier, tracks]) =>
      this.processAlbum(albumIdentifier, tracks),
    );
    await Promise.all(albumPromises);
  }

  /**
   * Groups track metadata by a computed album identifier.
   * @param {LoadedMetadata[]} metadataBatch - Array of track metadata.
   * @returns {[string, LoadedMetadata[]][]} - Array of tuples pairing album identifier with its tracks.
   */
  private groupTracksByAlbum(
    metadataBatch: LoadedMetadata[],
  ): [string, LoadedMetadata[]][] {
    const tracksByAlbum = new Map<string, LoadedMetadata[]>();
    for (const metadata of metadataBatch) {
      const trackTitle = metadata.title || basename(metadata.path);
      const albumIdentifier = `${metadata.album ?? trackTitle}-${metadata.albumartist || "Various Artists"}`;
      const tracks = tracksByAlbum.get(albumIdentifier) || [];
      tracks.push(metadata);
      tracksByAlbum.set(albumIdentifier, tracks);
    }
    return Array.from(tracksByAlbum.entries());
  }

  /**
   * Processes an album by upserting album, its artists, and tracks using metadata.
   * @param {string} albumIdentifier - The computed album identifier.
   * @param {LoadedMetadata[]} tracks - Array of track metadata belonging to the album.
   * @returns {Promise<void>}
   */
  private async processAlbum(
    albumIdentifier: string,
    tracks: LoadedMetadata[],
  ): Promise<void> {
    const albumId = uuid.v5(albumIdentifier, uuid.v5.DNS);
    const existingAlbum = await prisma.album.findUnique({
      where: { id: albumId },
      include: { artists: true },
    });

    const coverPath =
      existingAlbum?.coverPath ||
      (tracks[0].picture
        ? await this.getCoverPath(tracks[0].picture, albumId)
        : null);
    await prisma.album.upsert({
      where: { id: albumId },
      update: { coverPath: existingAlbum?.coverPath ? undefined : coverPath },
      create: {
        id: albumId,
        title: tracks[0].album || tracks[0].title || basename(tracks[0].path),
        coverPath,
      },
    });

    const artistMap = await this.upsertArtists(tracks, albumId);
    await this.upsertTracks(tracks, albumId, artistMap);
  }

  /**
   * Upserts artists associated with tracks and returns a mapping of artist names to records.
   * @param {LoadedMetadata[]} tracks - Array of track metadata.
   * @param {string} albumId - The album identifier.
   * @returns {Promise<Map<string, any>>} - A map of artist names to their upserted records.
   */
  private async upsertArtists(
    tracks: LoadedMetadata[],
    albumId: string,
  ): Promise<Map<string, any>> {
    const uniqueArtists = new Set<string>();
    for (const track of tracks) {
      const artistNames = track.artist?.split(/,|, /g) ?? [];
      for (const name of artistNames) {
        uniqueArtists.add(name.trim());
      }
    }

    const artistUpserts = Array.from(uniqueArtists).map((name) =>
      prisma.artist.upsert({
        where: { id: uuid.v5(`${name}-${albumId}`, uuid.v5.DNS) },
        update: {},
        create: {
          id: uuid.v5(`${name}-${albumId}`, uuid.v5.DNS),
          name,
          albums: { connect: { id: albumId } },
        },
      }),
    );

    const artistRecords = await prisma.$transaction(artistUpserts);
    const artistMap = new Map();
    artistRecords.forEach((artist) => artistMap.set(artist.name, artist));
    return artistMap;
  }

  /**
   * Upserts tracks into the database for a given album.
   * @param {LoadedMetadata[]} tracks - Array of track metadata.
   * @param {string} albumId - The album identifier.
   * @param {Map<string, any>} artistMap - Mapping of artist names to their records.
   * @returns {Promise<void>}
   */
  private async upsertTracks(
    tracks: LoadedMetadata[],
    albumId: string,
    artistMap: Map<string, any>,
  ): Promise<void> {
    const trackUpserts = tracks.map((metadata) => {
      const trackTitle = metadata.title || basename(metadata.path);
      const artistNames = metadata.artist?.split(/,|, /g) ?? [];
      const trackArtists = artistNames
        .map((name) => artistMap.get(name.trim()))
        .filter(Boolean);

      return prisma.track.upsert({
        where: { path: metadata.path },
        update: {},
        create: {
          title: trackTitle,
          path: metadata.path,
          album: { connect: { id: albumId } },
          dateAdded: metadata.dateAdded,
          artists: {
            connect: trackArtists.map((artist) => ({ id: artist.id })),
          },
        },
      });
    });

    await prisma.$transaction(trackUpserts);
  }

  /**
   * Updates a single track by parsing its metadata and saving it.
   * @param {string} path - The file path of the track.
   * @returns {Promise<void>}
   */
  async updateTrack(path: string): Promise<void> {
    const { common } = await mm.parseFile(path);
    const dateAdded = await fs.promises
      .stat(path)
      .then((stat) => stat.birthtime);

    const metadata: LoadedMetadata = {
      ...common,
      dateAdded,
      path,
      state: {
        current: 1,
        total: 1,
        done: true,
      },
    };

    await this.saveTracks([metadata]);
  }

  /**
   * Deletes tracks from the database that no longer exist in the provided file paths.
   * @param {string[]} tracksPath - Array of existing track file paths.
   * @returns {Promise<void>}
   */
  async deleteDeletedTracks(tracksPath: string[]): Promise<void> {
    const existingTracks = await prisma.track.findMany({
      select: { path: true },
    });
    const deletedPaths = existingTracks
      .map((track) => track.path)
      .filter((path) => !tracksPath.includes(path));

    await Promise.all(deletedPaths.map((path) => this.removeTrack(path)));
  }

  /**
   * Cleans up unused artists and albums after track deletion.
   * @returns {Promise<void>}
   */
  private async cleanUpAfterDelete(): Promise<void> {
    await prisma.artist.deleteMany({
      where: {
        tracks: {
          none: {},
        },
      },
    });

    await prisma.album.deleteMany({
      where: {
        tracks: {
          none: {},
        },
      },
    });
  }

  /**
   * Removes a track from the database and deletes its cover image if necessary.
   * @param {string} path - The file path of the track to remove.
   * @returns {Promise<void>}
   */
  async removeTrack(path: string): Promise<void> {
    const tracks = await prisma.track.findMany({
      where: { path },
      select: {
        path: true,
        album: {
          select: { coverPath: true },
        },
      },
    });

    await prisma.track.deleteMany({
      where: { path },
    });

    await Promise.all(
      tracks.map((track) => this.deleteCover(track.album.coverPath)),
    );

    await this.cleanUpAfterDelete();
  }

  /**
   * Deletes the cover image file if it exists.
   * @param {string | null | undefined} coverPath - The file path of the cover image.
   * @returns {Promise<void>}
   */
  async deleteCover(coverPath?: string | null): Promise<void> {
    if (!coverPath) return;
    try {
      await fs.promises.access(coverPath);
      await fs.promises.unlink(coverPath);
    } catch (error) {
      console.error(`Failed to delete cover at ${coverPath}:`, error);
    }
  }
}
