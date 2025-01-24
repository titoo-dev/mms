import type { Prisma } from "@prisma/client";
import { builder } from "../builder.js";
import {prisma} from "../../../../../prisma/client.js";

const AlbumWhereInput = builder.inputType("AlbumWhereInput", {
  fields: (t) => ({
    id: t.field({ type: "ID", required: false }),
    title: t.field({ type: "String", required: false }),
    artistName: t.field({ type: "String", required: false }),
  }),
});

const buildWhere = (
  args?: typeof AlbumWhereInput.$inferInput | null,
): Prisma.AlbumWhereInput => {
  if (!args) {
    return {};
  }
  return {
    ...(args.id && { id: args.id }),
    ...(args.title && { title: { contains: args.title } }),
    ...(args.artistName && {
      artists: { some: { name: { contains: args.artistName } } },
    }),
  };
};

builder.queryField("albums", (t) => {
  return t.prismaField({
    type: ["Album"],
    args: {
      where: t.arg({ type: AlbumWhereInput }),
    },
    resolve: (query, _root, args) => {
      return prisma.album.findMany({ ...query, where: buildWhere(args.where) });
    },
  });
});
