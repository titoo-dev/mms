import { server } from "./server/server.js";

server.listen(4000, () => {
  console.log("Server is running on http://localhost:4000");
});
