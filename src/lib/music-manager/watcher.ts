import watch from "node-watch";
import { config } from "../../config.js";
import { musicLibrary } from "./music-manager.js";
import throttle from "lodash.throttle";

export const startWatcher = () => {
  const handleUpdate = throttle(async (path: string) => {
    musicLibrary.emit("update", path);
  }, 1000);

  const handleRemove = throttle(async (path: string) => {
    musicLibrary.emit("remove", path);
  }, 1000);

  // @ts-ignore
  const watcher = watch(
    config.musicPath,
    { recursive: true },
    async (event: WatchEvent, path: string) => {
      if (event === "update") {
        await handleUpdate(path);
      }
      if (event === "remove") {
        await handleRemove(path);
      }
    },
  );

  return () => {
    watcher.close();
    handleUpdate.cancel();
    handleRemove.cancel();
  };
};

type WatchEvent = "update" | "remove";
