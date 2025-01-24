import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { yoga } from "./server/graphql/graphql.js";
import { audioRouter } from "./server/routes/track.js";
import { coverRouter } from "./server/routes/cover.js";
import { musicLibrary } from "./lib/music-manager/music-manager.js";

const app = express();
const apiRouter = express.Router();

app.use(cors());
app.use("/api", apiRouter);
app.use(yoga.graphqlEndpoint, yoga);

apiRouter.use("/cover", coverRouter);
apiRouter.use("/audio", audioRouter);

app.listen(config.serverPort, async () => {
  musicLibrary.initWatcher();
  console.log(`Server listening at http://localhost:${config.serverPort}`);
});
