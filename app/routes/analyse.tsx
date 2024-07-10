import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  LoaderFunctionArgs,
  MetaFunction,
  json,
  redirect,
} from "@remix-run/cloudflare";
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
} from "@/components/ui/card";

export const meta: MetaFunction = () => {
  return [
    { title: "CherryText.com" },
    {
      name: "description",
      content:
        "Automatically find typos and improvement suggestions in your docs.",
    },
  ];
};

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const { env } = context.cloudflare;
  const prisma = new PrismaClient({
    datasourceUrl: env.DATABASE_URL,
  }).$extends(withAccelerate());
  const inngest = getInngestClient(env);
  const urlTokens = new URL(request.url);
  const url = urlTokens.searchParams.get("url");
  if (!url) {
    return redirect("/");
  }

  const existingNote = await prisma.notes.findUnique({
    where: {
      url,
    },
  });

  if (existingNote) {
    return json({
      note: existingNote,
    });
  }

  const note = await prisma.notes.create({
    data: {
      url,
      typos: "[]",
    },
  });

  const inngestRun = await inngest.send({
    name: "app/get-text-from-html",
    data: {
      id: note.xata_id,
    },
  });

  const updatedNote = await prisma.notes.update({
    where: {
      url,
    },
    data: {
      inngest_run_id: inngestRun.ids[0],
    },
  });

  return json({ note });
};

const safeJsonParse: (jsonStr: string) => string[] = (jsonStr: string) => {
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    return [];
  }
};

export default function Index() {
  const { note } = useLoaderData<typeof loader>();
  const [isDomReady, setIsDomReady] = useState(false);
  useEffect(() => {
    if (!isDomReady) {
      setIsDomReady(true);
    }
  }, []);

  return (
    <div className="flex items-center justify-center p-4 font-sans">
      <ResizablePanelGroup direction="horizontal" className="min-h-[800px]">
        <ResizablePanel defaultSize={75}>
          {isDomReady ? (
            <div className="h-full">{parse(DOMPurify.sanitize(note.html))}</div>
          ) : (
            <div className="h-full">Loading...</div>
          )}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={25}>
          <Card className="border-none m-2">
            <CardHeader>
              <CardTitle>Typos</CardTitle>
              <CardDescription>Typos found by OpenAPI</CardDescription>
            </CardHeader>
            <CardContent>{safeJsonParse(note.typos).join(", ")}</CardContent>
          </Card>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
