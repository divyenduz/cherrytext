import { serve } from "inngest/cloudflare";
import { getInngestClient } from "../../inngest/client";
import { getFunctions } from "inngest/functions";

export const onRequest: PagesFunction<Env> = async (context) => {
  const { DATABASE_URL } = context.env;
  const inngest = getInngestClient(DATABASE_URL);
  return serve({
    client: inngest,
    functions: getFunctions(DATABASE_URL),
    // @ts-expect-error
  })({ request: context.request, env: context.env });
};
