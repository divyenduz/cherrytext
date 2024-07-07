import { LoaderFunctionArgs } from "@remix-run/cloudflare";

export function loader(args: LoaderFunctionArgs) {
    return new Response("ok", {
        status: 200
    })
}