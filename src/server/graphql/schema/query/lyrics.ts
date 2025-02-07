import * as fs from "node:fs";
import * as path from "node:path";
import * as mm from "music-metadata";
import { builder } from "../builder.js";
import { prisma } from "../../../../../prisma/client.js";

builder.objectType("Lyrics", {
  fields: (t) => ({
    text: t.exposeString("text"),
    isSync: t.exposeBoolean("isSync"),
  }),
});

builder.queryField("lyrics", (t) => {
  return t.field({
    type: "Lyrics",
    args: {
      trackId: t.arg.id({ required: true }),
    },

    resolve: async (_root, { trackId }) => {
      const track = await prisma.track.findUnique({
        where: { id: trackId },
      });

      if (!track) {
        return {
          text: "",
          isSync: false,
        };
      }

      const trackDir = path.dirname(track.path);
      const trackName = path.basename(track.path, path.extname(track.path));
      const lyricsPath = path.join(trackDir, `${trackName}.lrc`);

      if (fs.existsSync(lyricsPath)) {
        const lrcContent = await fs.promises.readFile(lyricsPath, "utf-8");
        return {
          text: lrcContent,
          isSync: true,
        };
      }

      const tags = (await mm.parseFile(track.path, { skipCovers: true }))
        .common;
      return {
        text: tags.lyrics?.at(0)?.text ?? "",
        isSync: false,
      };
    },
  });
});
