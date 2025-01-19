import { builder } from "./builder.js";
import { Prisma } from "@prisma/client";
import { prisma } from "$prisma/client.js";
import { musicLibrary } from "../../lib/music-manager/music-manager.js";

builder.queryType({
  fields: (t) => {
    return {
      tracks: t.prismaField({
        args: {
          id: t.arg.id(),
          title: t.arg.string(),
          artistName: t.arg.string(),
          albumTitle: t.arg.string(),
        },
        type: ["Track"],
        resolve: async (query, _root, args) => {
          const filter: Prisma.TrackWhereInput = {};

          for (const [key, value] of Object.entries(args)) {
            if (!value) continue;
            const keyName = key as Extract<
              keyof Prisma.TrackWhereInput,
              keyof typeof args
            >;

            if (keyName === "title") {
              filter[keyName] = {
                contains: value,
              };
              continue;
            }

            if (keyName === "id") {
              filter[keyName] = value;
              continue;
            }

            if (keyName === "artistName") {
              filter.artists = {
                some: {
                  name: {
                    contains: value,
                  },
                },
              };
              continue;
            }

            if (keyName === "albumTitle") {
              filter.album = {
                title: {
                  contains: value,
                },
              };
            }
          }

          return await prisma.track.findMany({
            ...query,
            where: filter,
          });
        },
      }),

      cover: t.field({
        type: "String",
        args: {
          coverPath: t.arg.string({ required: true }),
        },
        resolve: async (_root, args) => {
          const coverBuffer = await musicLibrary.getCover(args.coverPath);
          return coverBuffer.toString("base64");
        },
      }),
    };
  },
});
