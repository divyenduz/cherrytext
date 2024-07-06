import { Inngest, InngestMiddleware } from "inngest";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";

export function getInngestClient(databaseURL: string, eventKey: string) {
  const prismaMiddleware = new InngestMiddleware({
    name: "Prisma Middleware",
    init() {
      const prisma = new PrismaClient({
        datasourceUrl: databaseURL,
      }).$extends(withAccelerate());

      return {
        onFunctionRun(ctx) {
          return {
            transformInput(ctx) {
              return {
                // Anything passed via `ctx` will be merged with the function's arguments
                ctx: {
                  prisma,
                },
              };
            },
          };
        },
      };
    },
  });

  const inngest = new Inngest({
    id: "cherrytext",
    eventKey,
    middleware: [prismaMiddleware],
  });

  return inngest;
}
