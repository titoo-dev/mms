import { LoadedMetadata, musicLibrary } from "~~/lib/music-manager";

export default defineEventHandler(async (event) => {
  const eventStream = createEventStream(event);
  const sendEvent = async (eventType: string, data: any) => {
    await eventStream.push(JSON.stringify({ type: eventType, data }));
  };

  const timeout = setTimeout(async () => {
    await sendEvent("status", { done: false });
    musicLibrary.on("trackLoaded", async (metadata: LoadedMetadata) => {
      await sendEvent("track", metadata);
    });
  }, 0);

  eventStream.onClosed(() => {
    clearTimeout(timeout);
    eventStream.close();
  });

  return eventStream.send();
});
