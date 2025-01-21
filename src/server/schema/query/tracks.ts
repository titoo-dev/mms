import { builder } from "../builder.js";
import { Prisma } from "@prisma/client";
import { prisma } from "$prisma/client.js";
import { TrackSortField, SortOrder } from "../extraTypes.js";
import { StateKey } from "src/server/types.js";

const TrackSortByInput = builder.inputType("TrackSortByInput", {
  fields: (t) => ({
    field: t.field({ type: TrackSortField, required: true }),
    order: t.field({ type: SortOrder, required: true }),
  }),
});

const TrackWhereInput = builder.inputType("TrackWhereInput", {
  fields: (t) => ({
    id: t.field({ type: "ID", required: false }),
    title: t.field({ type: "String", required: false }),
    artistName: t.field({ type: "String", required: false }),
    albumTitle: t.field({ type: "String", required: false }),
  }),
});

const buildWhere = (
  args: typeof TrackWhereInput.$inferInput,
): Prisma.TrackWhereInput => ({
  ...(args.id && { id: args.id }),
  ...(args.title && { title: { contains: args.title } }),
  ...(args.artistName && {
    artists: { some: { name: { contains: args.artistName } } },
  }),
  ...(args.albumTitle && { album: { title: { contains: args.albumTitle } } }),
});

const buildSortBy = (
  args?: typeof TrackSortByInput.$inferInput | null,
): Prisma.TrackOrderByWithRelationInput => {
  if (!args) return {};
  return {
    ...(args.field === TrackSortField.TITLE && { title: args.order }),
    ...(args.field === TrackSortField.DATE_ADDED && { dateAdded: args.order }),
    ...(args.field === TrackSortField.ALBUM_TITLE && {
      album: { title: args.order },
    }),
  };
};

builder.queryField("tracks", (t) =>
  t.prismaField({
    args: {
      where: t.arg({ type: TrackWhereInput, required: false }),
      sortBy: t.arg({ type: TrackSortByInput, required: false }),
    },
    type: ["Track"],
    resolve: async (query, _root, args) => {
      const filter = buildWhere(args.where || {});
      const orderBy = buildSortBy(args.sortBy);

      return prisma.track.findMany({
        ...query,
        where: filter,
        orderBy,
      });
    },
  }),
);

builder.queryField("dbInitialized", (t) => {
  return t.field({
    type: "Boolean",
    resolve: async () => {
      const dirHash = await prisma.state
        .findUnique({
          where: { key: StateKey.DirectoryHash },
        })
        .then((state) => state?.value);

      return !!dirHash;
    },
  });
});
