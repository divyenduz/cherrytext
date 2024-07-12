import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
  json,
  redirect,
} from "@remix-run/cloudflare";
import { Form, useLoaderData, useRevalidator } from "@remix-run/react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

export async function action({ request, context }: ActionFunctionArgs) {
  const { env } = context.cloudflare;
  const prisma = new PrismaClient({
    datasourceUrl: env.DATABASE_URL,
  }).$extends(withAccelerate());
  const inngest = getInngestClient(env);

  const body = await request.formData();
  const url = body.get("url") as string;
  if (!url) {
    return redirect("/");
  }

  const existingNote = await prisma.notes.findUnique({
    where: {
      url,
    },
  });

  if (!existingNote) {
    throw new Error(
      `A note should exist for revalidation. No note with URL: ${url} exists.`
    );
  }

  const inngestRun = await inngest.send({
    name: "app/get-text-from-html",
    data: {
      id: existingNote.xata_id,
    },
    // Note: schedule to run 1 second in future to give the note time to update inngest_run_status
    ts: Date.now() + 1 * 1000,
  });

  const note = await prisma.notes.update({
    where: {
      url,
    },
    data: {
      inngest_run_id: inngestRun.ids[0],
      inngest_run_status: "",
      typos: "[]",
      note_html: {
        update: {
          html: "",
          text: "",
        },
      },
    },
  });

  return json({ success: true });
}

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
    include: {
      note_html: true,
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
      note_html: {
        create: {
          html: "",
          text: "",
        },
      },
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
    include: {
      note_html: true,
    },
  });

  return json({ note: updatedNote });
};

const safeJsonParse: (jsonStr: string) => string[] = (
  jsonStr: string = "[]"
) => {
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error(e);
    return [];
  }
};

export default function Index() {
  const revalidator = useRevalidator();
  const { note } = useLoaderData<typeof loader>();
  const [isDomReady, setIsDomReady] = useState(false);

  const isHTMLAdded = note.inngest_run_status.includes("HTML_ADDED");
  const areTyposAdded = note.inngest_run_status.includes("TYPOS_ADDED");
  const isDone = isHTMLAdded && areTyposAdded;

  useEffect(() => {
    if (!isDomReady) {
      setIsDomReady(true);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isHTMLAdded || !areTyposAdded) {
        revalidator.revalidate();
      }
    }, 1000);
    return () => {
      return clearInterval(interval);
    };
  }, [note.inngest_run_status]);

  const typos = safeJsonParse(note.typos);

  return (
    <div className="flex items-center justify-center p-4 font-sans">
      <ResizablePanelGroup direction="horizontal" className="min-h-[800px]">
        <ResizablePanel defaultSize={75}>
          {isHTMLAdded && isDomReady ? (
            <div className="h-full">
              {parse(DOMPurify.sanitize(note.note_html?.html || ""))}
            </div>
          ) : (
            <div className="h-screen flex items-center justify-center">
              Beep bop beep... fetching the article
            </div>
          )}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={25}>
          {isDone && (
            <Card className="border-none m-2">
              <CardHeader>
                <CardTitle>Re-analyse Document</CardTitle>
                <CardDescription>
                  Re-fetch the HTML and analyse the document again
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form
                  method="post"
                  className="flex flex-col items-center justify-center"
                >
                  <Input
                    hidden
                    className="max-w-0"
                    type="url"
                    name="url"
                    placeholder="Enter URL of your documentation page"
                    value={note.url}
                  />
                  <Button
                    onClick={(e) => {
                      const r = confirm(
                        "Are you sure that you watch to fetch the HTML and analyse this document again?"
                      );
                      if (!r) {
                        e.preventDefault();
                        return;
                      }
                    }}
                    type="submit"
                  >
                    Re-analyse
                  </Button>
                </Form>
              </CardContent>
            </Card>
          )}
          <Card className="border-none m-2">
            <CardHeader>
              <CardTitle>Typos</CardTitle>
              <CardDescription>
                {areTyposAdded ? "Typos found by OpenAPI" : "Finding typos..."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {typos.length > 0 ? typos.join(", ") : "No typos found"}
            </CardContent>
          </Card>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
