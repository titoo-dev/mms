import { StateKey } from "../types.js";
import { builder } from "./builder.js";
import { prisma } from "$prisma/client.js";
import { musicLibrary } from "../../lib/music-manager/music-manager.js";

builder.mutationType({
  fields: (t) => {
    return {
      loadTracks: t.field({
        type: "Boolean",
        description:
          "Load all tracks and rerturn true if the current database was outdated and false otherwise",
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
    };
  },
});
