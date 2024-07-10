import { Inngest, InngestMiddleware } from "inngest";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";

export function getInngestClient(env: Env) {
  const prismaMiddleware = new InngestMiddleware({
    name: "Prisma Middleware",
    init() {
      const prisma = new PrismaClient({
        datasourceUrl: env.DATABASE_URL,
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
    eventKey: env.INNGEST_EVENT_KEY,
    isDev: env.INNGEST_DEV === '0' ? false : true,
    middleware: [prismaMiddleware],
  });

  return inngest;
}
