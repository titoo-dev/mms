import { builder } from "./builder.js";
import { prisma } from "$prisma/client.js";

builder.prismaObject('Track', {
  fields: (t) => ({
    id: t.exposeID('id'),
    album: t.relation('album'),
    path: t.exposeString('path'),
    title: t.exposeString('title'),
    coverPath: t.exposeString('coverPath'),
  })
})

export const schema = builder.toSchema();
