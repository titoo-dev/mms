import SchemaBuilder from "@pothos/core";
import { prisma } from "$prisma/client.js";
import type { LoadedTracks } from "../types.js";
import PrismaPlugin from "@pothos/plugin-prisma";

import type PrismaTypes from "@pothos/plugin-prisma/generated";
import type { pubsub } from "./pubsub.js";

export const builder = new SchemaBuilder<{
  PrismaTypes: PrismaTypes;
  Objects: {
    LoadedTracks: LoadedTracks;
  };
  Context: { pubsub: typeof pubsub };
  Scalars: {
    Date: {
      Input: Date;
      Output: Date;
    };
  };
}>({
  plugins: [PrismaPlugin],
  prisma: {
    client: prisma,
    exposeDescriptions: true,
    filterConnectionTotalCount: true,
    onUnusedQuery: process.env.NODE_ENV === "production" ? null : "warn",
  },
});
