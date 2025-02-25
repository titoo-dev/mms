import { prisma } from "~~/prisma";
import { Prisma } from "@prisma/client";

const buildWhere = (
  query: RequestQuery,
): Prisma.TrackWhereInput | undefined => {
  const field = query.field || "*";
  if (!query.query) return;

  switch (field) {
    case "id":
      return { id: query.query };
    case "*":
      return {
        OR: [
          { title: { contains: query.query } },
          { artists: { some: { name: { contains: query.query } } } },
          { album: { title: { contains: query.query } } },
        ],
      };
    case "artist":
      return {
        artists: { some: { name: { contains: query.query } } },
      };
    default:
      return {
        [field]: { contains: query.query },
      };
  }
};

export default defineEventHandler(async (event) => {
  const query = getQuery<RequestQuery>(event);
  const orderByDirection = query.orderByField
    ? query.orderByDirection || "asc"
    : undefined;

  try {
    const tracks = await prisma.track.findMany({
      where: buildWhere(query),
      orderBy: query.orderByField && {
        [query.orderByField]: orderByDirection,
      },
      include: {
        artists: true,
        album: true,
      },
    });

    return {
      error: null,
      data: tracks,
      success: true,
    };
  } catch (e) {
    return {
      data: [],
      error: e.message,
      success: false,
    };
  }
});

type RequestQuery = {
  query?: string;
  orderByDirection?: "asc" | "desc";
  orderByField?: "title" | "dateAdded" | "album";
  field?: "*" | "title" | "artist" | "album" | "id";
};
