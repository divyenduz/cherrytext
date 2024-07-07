import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { LoaderFunctionArgs, json, redirect } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { stripHtml } from "string-strip-html";
import { getInngestClient } from "inngest/client";
import DOMPurify from "dompurify";
import parse from "html-react-parser";
import { useEffect, useState } from "react";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export const loader = async ({
  params,
  request,
  context,
}: LoaderFunctionArgs) => {
  const { env } = context.cloudflare;
  const prisma = new PrismaClient({
    datasourceUrl: env.DATABASE_URL,
  }).$extends(withAccelerate());
  const inngest = getInngestClient(
    env.DATABASE_URL,
    env.INNGEST_EVENT_KEY,
    env.INNGEST_DEV
  );
  const urlTokens = new URL(request.url);
  const url = urlTokens.searchParams.get("url");
  if (!url) {
    return redirect("/");
  }

  const r = await fetch(url, {});
  const rText = await r.text();

  const text = stripHtml(rText).result;

  const note = await prisma.notes.upsert({
    where: {
      url,
    },
    create: {
      url,
      text,
      typos: "[]",
    },
    update: {
      url,
      text,
    },
  });

  await inngest.send({
    name: "app/find-typos",
    data: {
      id: note.xata_id,
    },
  });

  return json({ note, url, html: rText, text });
};

export default function Index() {
  const { note, url, html, text } = useLoaderData<typeof loader>();
  const [isDomReady, setIsDomReady] = useState(false);
  useEffect(() => {
    if (!isDomReady) {
      setIsDomReady(true);
    }
  }, []);

  return (
    <div className="flex items-center justify-center p-4 font-sans">
      <ResizablePanelGroup
        direction="horizontal"
        className="min-h-[800px] rounded-lg border border-red-600"
      >
        <ResizablePanel defaultSize={75}>
          {isDomReady ? (
            <div className="h-full">{parse(DOMPurify.sanitize(html))}</div>
          ) : (
            <div className="h-full">Loading...</div>
          )}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={25}>
          <Card>
            <CardHeader>
              <CardTitle>Typos</CardTitle>
              <CardDescription>Typos found by OpenAPI</CardDescription>
            </CardHeader>
            <CardContent>
              {(JSON.parse(note.typos) as string[]).join(", ")}
            </CardContent>
          </Card>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
