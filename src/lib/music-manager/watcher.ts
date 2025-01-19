import watch from "node-watch";
import { config } from "../../config.js";
import { musicLibrary } from "./music-manager.js";

export const startWatcher = () => {
  // @ts-ignore
  watch(
    config.musicPath,
    { recursive: true },
    async (event: WatchEvent, path: string) => {
      if (event === "update") {
        musicLibrary.emit("update", path);
      }

      if (event === "remove") {
        musicLibrary.emit("remove", path);
      }
    },
  );
};

type WatchEvent = "update" | "remove";
