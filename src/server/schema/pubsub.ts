import { createPubSub } from "graphql-yoga";
import type { LoadedTracks } from "../types.js";

export const pubsub = createPubSub<{
  LOADED_TRACKS: [LoadedTracks & {done: boolean}];
}>({});
