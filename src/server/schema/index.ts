import { builder } from "./builder.js";

import "./base.js";
import "./query.js";
import "./mutation.js";
import "./subscription.js";

export const schema = builder.toSchema();
