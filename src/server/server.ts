import { createServer } from "node:http";
import { createYoga } from "graphql-yoga";
import { schema } from "./db/schema.js";

const yoga = createYoga({ schema });

export const server = createServer(yoga);
