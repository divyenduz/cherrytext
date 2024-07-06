import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { LoaderFunctionArgs, json, redirect } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { Readability } from "@mozilla/readability";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const urlTokens = new URL(request.url);
  const url = urlTokens.searchParams.get("url");
  if (!url) {
    return redirect("/");
  }

  const r = await fetch(url, {});
  const rText = await r.text();

  return json({ url, html: rText });
};

export default function Index() {
  const { url, html } = useLoaderData<typeof loader>();
  return (
    <div className="flex items-center justify-center p-4 font-sans">
      <ResizablePanelGroup
        direction="horizontal"
        className="min-h-[800px] rounded-lg border border-red-600"
      >
        <ResizablePanel defaultSize={75}>
          <div
            dangerouslySetInnerHTML={{
              __html: html,
            }}
            className="h-full"
          ></div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={25}>Two</ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
