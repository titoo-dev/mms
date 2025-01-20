import { builder } from "../builder.js";
import { musicLibrary } from "src/lib/music-manager/music-manager.js";

builder.queryField("cover", (t) => {
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
