import * as uuid from "uuid";
import { config } from "./config.js";
import { server } from "./server/server.js";
import { loadTracks } from "./lib/music-manager.js";

server.listen(config.serverPort, async () => {
  console.log(`Server listening at http://localhost:${config.serverPort}`);

  await loadTracks((album) => {
    return uuid.v5(album, uuid.v5.URL);
  });
});
