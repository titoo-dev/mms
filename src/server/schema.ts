import { v5 as uuid } from "uuid";
import { builder } from "./builder.js";
import { prisma } from "$prisma/client.js";
import { loadTracks } from "../lib/music-manager.js";

const NAME_SPACE = uuid.URL;

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
    path: t.exposeString("path"),
    title: t.exposeString("title"),
    coverPath: t.exposeString("coverPath"),
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
  }),
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
