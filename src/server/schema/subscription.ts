import { builder } from "./builder.js";

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
