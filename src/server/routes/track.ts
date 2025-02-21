import fs from "fs";
import express from "express";
import { prisma } from "../../../prisma/client.js";

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
    res.status(404).send("Track not found");
    return;
  }

  const filePath = track.path!;
  const stat = fs.statSync(filePath);

  res.set({
    "Accept-Ranges": "bytes",
    "Content-Type": "audio/mpeg",
    "Content-Length": stat.size,
  });

  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;

    if (start >= stat.size) {
      res.status(416).send("Requested range not satisfiable");
      return;
    }

    res.status(206).set({
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Content-Length": end - start + 1,
    });

    const fileStream = fs.createReadStream(filePath, { start, end });
    fileStream.pipe(res);
  } else {
    // If no range is requested, stream  entire file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }
});
