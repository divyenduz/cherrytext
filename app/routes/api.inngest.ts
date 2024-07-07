import { serve } from "inngest/remix";
import { getInngestClient } from "../../inngest/client";
import { getFunctions } from "inngest/functions";
import { LoaderFunctionArgs } from "@remix-run/cloudflare";

function getHandler(args: LoaderFunctionArgs) {
    const { env } = args.context.cloudflare

    const handler = serve({
        client: getInngestClient(env.DATABASE_URL, env.INNGEST_EVENT_KEY),
        functions: getFunctions(env.DATABASE_URL, env.OPENAI_API_KEY, env.INNGEST_EVENT_KEY),
    });
    return handler

}

export function loader(args: LoaderFunctionArgs) {
    const handler = getHandler(args)
    return handler(args)
}

export function action(args: LoaderFunctionArgs) {
    const handler = getHandler(args)
    return handler(args)
}