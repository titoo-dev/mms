import express from "express";
import { prisma } from "../../../prisma/client.js";
import { musicLibrary } from "../../lib/music-manager/music-manager.js";

export const coverRouter = express.Router();

coverRouter.get("/:trackId", async (req, res) => {
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
  const coverBuffer = await musicLibrary.getCover(track.album.coverPath!);
  res.setHeader("Content-Type", "image/jpeg");
  res.send(coverBuffer);
});
