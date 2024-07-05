import { LoaderFunctionArgs, json, type MetaFunction } from "@remix-run/cloudflare";
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { useLoaderData } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    {
      name: "description",
      content: "Welcome to Remix on Cloudflare!",
    },
  ];
};

export const loader = async ({context}: LoaderFunctionArgs) => {
  const { env } = context.cloudflare
  const prisma = new PrismaClient({
    datasourceUrl: env.DATABASE_URL,
  }).$extends(withAccelerate())
  const numberOfNotes = await prisma.notes.count()
  return json({ numberOfNotes });
};

export default function Index() {
  const { numberOfNotes } = useLoaderData<typeof loader>()
  return (
    <div className="font-sans p-4">
      <h1 className="text-3xl">Welcome to Remix on Cloudflare {numberOfNotes}</h1>
      <ul className="list-disc mt-4 pl-6 space-y-2">
        <li>
          <a
            className="text-blue-700 underline visited:text-purple-900"
            target="_blank"
            href="https://remix.run/docs"
            rel="noreferrer"
          >
            Remix Docs
          </a>
        </li>
        <li>
          <a
            className="text-blue-700 underline visited:text-purple-900"
            target="_blank"
            href="https://developers.cloudflare.com/pages/framework-guides/deploy-a-remix-site/"
            rel="noreferrer"
          >
            Cloudflare Pages Docs - Remix guide
          </a>
        </li>
      </ul>
    </div>
  );
}
