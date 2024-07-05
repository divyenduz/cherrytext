import { getInngestClient } from "./client";

export const getFunctions = (databaseURL: string) => {
  const inngest = getInngestClient(databaseURL);

  const helloWorld = inngest.createFunction(
    { id: "hello-world" },
    { event: "test/hello.world" },
    async ({ event, step }) => {
      await step.sleep("wait-a-moment", "1s");
      return { event, body: "Hello, World!" };
    }
  );

  const numberOfNotes = inngest.createFunction(
    { id: "number-of-notes" },
    { event: "test/number-of-notes" },
    async ({ event, step, prisma }) => {
      await step.sleep("wait-a-moment", "1s");
      const numberOfNotes = await prisma.notes.count();
      return { event, body: `Notes: ${numberOfNotes}` };
    }
  );

  return [helloWorld, numberOfNotes];
};
