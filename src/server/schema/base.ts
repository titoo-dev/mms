import { builder } from "./builder.js";
import { DateTimeResolver } from "graphql-scalars";

builder.addScalarType("Date", DateTimeResolver, {});

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
    dateAdded: t.expose("dateAdded", {
      type: "Date",
    }),
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
