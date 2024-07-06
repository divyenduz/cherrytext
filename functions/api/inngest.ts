import { serve } from "inngest/cloudflare";
import { getInngestClient } from "../../inngest/client";
import { getFunctions } from "inngest/functions";

export const onRequest: PagesFunction<Env> = async (context) => {
  const { DATABASE_URL, OPENAI_API_KEY, INNGEST_EVENT_KEY } = context.env;
  const inngest = getInngestClient(DATABASE_URL, INNGEST_EVENT_KEY);
  return serve({
    client: inngest,
    functions: getFunctions(DATABASE_URL, OPENAI_API_KEY, INNGEST_EVENT_KEY),
    // @ts-expect-error
  })({ request: context.request, env: context.env });
};
