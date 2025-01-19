import { config } from "./config.js";
import { server } from "./server/server.js";
import { musicLibrary } from "./lib/music-manager/music-manager.js";

server.listen(config.serverPort, async () => {
  musicLibrary.initWatcher();
  console.log(`Server listening at http://localhost:${config.serverPort}`);
});
