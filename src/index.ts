import { config } from "./config.js";
import { server } from "./server/server.js";

server.listen(config.serverPort, async () => {
  console.log(`Server listening at http://localhost:${config.serverPort}`);
});
