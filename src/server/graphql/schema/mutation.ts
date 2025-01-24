import { StateKey } from "../../types.js";
import { builder } from "./builder.js";
import { musicLibrary } from "../../../lib/music-manager/music-manager.js";
import {prisma} from "../../../../prisma/client.js";

builder.mutationType({
  fields: (t) => {
    return {
      loadTracks: t.field({
        type: "Boolean",
        description:
          "Load all tracks and return true if the current database was outdated and false otherwise",
        resolve: async (_root, _args, ctx) => {
          const { shouldReload, currentHash } =
            await musicLibrary.shouldReloadTracks();
          if (shouldReload) {
            for await (const trackMetadata of musicLibrary.loadTracks()) {
              ctx.pubsub.publish("LOADED_TRACKS", trackMetadata.state);
            }
            await prisma.state.upsert({
              where: { key: StateKey.DirectoryHash },
              create: { key: StateKey.DirectoryHash, value: currentHash },
              update: { value: currentHash },
            });
            return true;
          }
          return false;
        },
      }),

      favoriteTrack: t.prismaField({
        type: "Track",
        args: {
          trackId: t.arg.id({ required: true }),
        },
        resolve: async (_query, _root, { trackId }) => {
          return prisma.track.update({
            where: { id: trackId },
            data: {
              isFavorite: true,
            },
          });
        },
      }),

      trackPlay: t.prismaField({
        type: "PlayEvent",
        args: {
          trackId: t.arg.id({ required: true }),
        },
        resolve: async (_query, _root, { trackId }) => {
          const track = await prisma.track.findUnique({
            where: { id: trackId },
          });

          if (!track) {
            throw new Error(`Track with ID ${trackId} not found`);
          }

          const playEvent = await prisma.playEvent.create({
            data: {
              trackId,
            },
          });

          return playEvent;
        },
      }),

      createPlayList: t.prismaField({
        type: "PlayList",
        args: {
          name: t.arg.string({ required: true }),
          tracks: t.arg.idList(),
        },
        resolve: async (_query, _root, { name, tracks }) => {
          const tracksConnected = tracks ? tracks.map((id) => ({ id })) : [];
          return prisma.playList.create({
            data: {
              name,
              tracks: {
                connect: [...tracksConnected],
              },
            },
          });
        },
      }),

      addTrackToPlayList: t.prismaField({
        type: "PlayList",
        args: {
          playListId: t.arg.id({ required: true }),
          trackId: t.arg.id({ required: true }),
        },
        resolve: async (_query, _root, { playListId, trackId }) => {
          return prisma.playList.update({
            where: { id: playListId },
            data: {
              tracks: {
                connect: { id: trackId },
              },
            },
          });
        },
      }),

      removeTrackFromPlayList: t.prismaField({
        type: "PlayList",
        args: {
          playListId: t.arg.id({ required: true }),
          trackId: t.arg.id({ required: true }),
        },
        resolve: async (_query, _root, { playListId, trackId }) => {
          return prisma.playList.update({
            where: { id: playListId },
            data: {
              tracks: {
                disconnect: { id: trackId },
              },
            },
          });
        },
      }),
    };
  },
});
