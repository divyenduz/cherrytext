import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  json,
  redirect,
  type MetaFunction,
} from "@remix-run/cloudflare";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Form, useLoaderData } from "@remix-run/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    {
      name: "description",
      content: "Welcome to Remix on Cloudflare!",
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
    return json({ error: "URL is required" }, { status: 400 });
  }
  return redirect(`/analyse/?url=${url}`);
}

export default function Index() {
  const { numberOfNotes } = useLoaderData<typeof loader>();
  return (
    <div className="flex items-center justify-center p-4 font-sans">
      <Form method="post">
        <Input type="url" name="url" placeholder="Enter URL" />
        <Button type="submit">Button</Button>
      </Form>
    </div>
  );
}
