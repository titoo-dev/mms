import express from "express";
import { prisma } from "../../../prisma/client.js";
import { musicLibrary } from "../../lib/music-manager/music-manager.js";

export const audioRouter = express.Router();

audioRouter.get("/:trackId", async (req, res) => {
  const { trackId } = req.params;

  const track = await prisma.track.findUnique({
    where: { id: trackId },
    include: {
      album: true,
    },
  });
  if (!track) {
    throw new Error("Track not found");
  }
  const audioBuffer = await musicLibrary.getAudio(track.path!);
  res.setHeader("Content-Type", "audio/mpeg");
  res.send(audioBuffer);
});
