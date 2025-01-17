import { builder } from "./builder.js";
import { prisma } from "$prisma/client.js";
import { musicLibrary } from "../lib/music-manager.js";

builder.objectType("LoadedTracks", {
  fields: (t) => ({
    current: t.exposeInt("current"),
    total: t.exposeInt("total"),
  }),
});

builder.prismaObject("State", {
  fields: (t) => ({
    key: t.exposeString("key"),
    value: t.exposeString("value"),
  }),
});

builder.prismaObject("Track", {
  fields: (t) => ({
    id: t.exposeID("id"),
    album: t.relation("album"),
    artists: t.relation("artists"),
    path: t.exposeString("path"),
    title: t.exposeString("title"),
  }),
});

builder.prismaObject("Artist", {
  fields: (t) => ({
    id: t.exposeID("id"),
    name: t.exposeString("name"),
    tracks: t.relation("tracks"),
    albums: t.relation("albums"),
  }),
});

builder.prismaObject("Album", {
  fields: (t) => ({
    id: t.exposeID("id"),
    tracks: t.relation("tracks"),
    title: t.exposeString("title"),
    artists: t.relation("artists"),
    coverPath: t.exposeString("coverPath"),
  }),
});

builder.queryType({
  fields: (t) => {
    return {
      tracks: t.prismaField({
        type: ["Track"],
        resolve: async (query) => {
          return await prisma.track.findMany(query);
        },
      }),
    };
  },
});

builder.mutationType({
  fields: (t) => {
    return {
      loadTracks: t.field({
        type: "Boolean",
        description:
          "Load all tracks and rerturn true if the current database was outdated and false otherwise",
        resolve: async (_root, _args, ctx) => {
          const storedHash = (
            await prisma.state.findUnique({ where: { key: "musicDirHash" } })
          )?.value;
          const currentHash = await musicLibrary.getDirectoryHash();

          if (storedHash !== currentHash) {
            await musicLibrary.loadTracks(async (metadata, loadingState) => {
              // I can call saveTrack inside load track but calling it here makes it easier to understand I think
              await musicLibrary.saveTrack(metadata);
              ctx.pubsub.publish("LOADED_TRACKS", {
                ...loadingState,
                done: loadingState.current === loadingState.total,
              });
            });
            await prisma.state.upsert({
              where: { key: "musicDirHash" },
              create: { key: "musicDirHash", value: currentHash },
              update: { value: currentHash },
            });
            return true;
          }
          return false;
        },
      }),
    };
  },
});

builder.subscriptionType({
  fields: (t) => {
    return {
      loadedTrack: t.field({
        description:
          "A subscription that sends the current and total number of loaded tracks",
        type: "LoadedTracks",
        subscribe: (_root, _args, ctx) => {
          return ctx.pubsub.subscribe("LOADED_TRACKS");
        },
        resolve: (payload) => payload,
      }),
    };
  },
});

export const schema = builder.toSchema();
