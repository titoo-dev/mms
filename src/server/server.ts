import { createServer } from "node:http";
import { createYoga } from "graphql-yoga";
import { schema } from "./schema/index.js";
import { pubsub } from "./schema/pubsub.js";

const yoga = createYoga({
  schema,
  context: () => ({
    pubsub,
  }),
});

export const server = createServer(yoga);
