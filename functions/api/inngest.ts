import { serve } from "inngest/cloudflare";
import { inngest } from "../../inngest/client";
import { helloWorld } from "inngest/functions";

export const onRequest = serve({
  client: inngest,
  functions: [helloWorld],
});

