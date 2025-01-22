import { createYoga } from "graphql-yoga";
import { schema } from "./schema/index.js";
import { pubsub } from "./schema/pubsub.js";

export const yoga = createYoga({
  schema,
  context: () => ({
    pubsub,
  }),
});
