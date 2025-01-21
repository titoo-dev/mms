import { builder } from "../builder.js";
import { musicLibrary } from "src/lib/music-manager/music-manager.js";
import { prisma } from "$prisma/client.js";

builder.queryField("coverFromPath", (t) => {
  return t.field({
    type: "String",
    args: {
      coverPath: t.arg.string({ required: true }),
    },
    resolve: async (_root, args) => {
      const coverBuffer = await musicLibrary.getCover(args.coverPath);
      return coverBuffer.toString("base64");
    },
  });
});

builder.queryField("coverFromTrack", (t) => {
  return t.field({
    type: "String",
    args: {
      trackId: t.arg.id({ required: true }),
    },
    resolve: async (_root, args) => {
      const track = await prisma.track.findUnique({
        where: { id: args.trackId },
        include: {
          album: true,
        },
      });
      if (!track) {
        throw new Error("Track not found");
      }
      const coverBuffer = await musicLibrary.getCover(track.album.coverPath!);
      return coverBuffer.toString("base64");
    },
  });
});
