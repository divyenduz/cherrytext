import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  json,
  redirect,
  type MetaFunction,
} from "@remix-run/cloudflare";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Form, useActionData } from "@remix-run/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

export const loader = async ({ context }: LoaderFunctionArgs) => {
  const { env } = context.cloudflare;
  const prisma = new PrismaClient({
    datasourceUrl: env.DATABASE_URL,
  }).$extends(withAccelerate());
  const numberOfNotes = await prisma.notes.count();
  return json({ numberOfNotes });
};

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.formData();
  const url = body.get("url");
  if (!url) {
    return json(
      { type: "missing_url", error: "URL is required" },
      { status: 400 }
    );
  }
  return redirect(`/analyse/?url=${url}`);
}

export default function Index() {
  const r = useActionData<typeof action>();
  const isMissingUrlError = r?.type === "missing_url";
  return (
    <div className="flex flex-col space-y-4 items-center justify-center font-sans h-screen w-screen">
      <h1 className="text-3xl">CherryText</h1>
      <Form
        method="post"
        className="flex flex-col items-center justify-center p-4 space-y-2"
      >
        <Input
          className="min-w-80"
          type="url"
          name="url"
          placeholder="Enter URL of your documentation page"
        />
        <Button type="submit">Submit</Button>
        {isMissingUrlError && (
          <Alert variant="destructive">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertDescription>Error: {r.error}</AlertDescription>
          </Alert>
        )}
      </Form>
    </div>
  );
}
