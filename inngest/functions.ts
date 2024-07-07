import { getInngestClient } from "./client";
import OpenAI from 'openai'

export const getFunctions = (databaseURL: string, openAPIKey: string, eventKey: string, inngestDev: string) => {
  const inngest = getInngestClient(databaseURL, eventKey, inngestDev);

  const findTypos = inngest.createFunction(
    { id: "find-typos" },
    { event: "app/find-typos" },
    async ({ event, step, prisma }) => {
      const { id } = event.data
      const note = await prisma.notes.findUnique({
        where: { xata_id: id },
      });

      if (!note) {
        return
      }

      // You can execute code that interacts with external services
      // All code is retried automatically on failure
      // Read more about Inngest steps: https://www.inngest.com/docs/learn/inngest-steps
      const typos = await step.run("step/find-typos", async () => {
        if (openAPIKey) {
          const openai = new OpenAI({
            apiKey: openAPIKey,
          });
          const completion = await openai.chat.completions.create({
            messages: [
              {
                role: "system",
                content:
                  "Please find typos in this text, look at only single words and never two or more words together. Return the response as a JSON array string, just return the string so that it can be parsed with JSON.parse function.",
              },
              { role: "user", content: note.text },
            ],
            model: "gpt-4-turbo",
          });
          return (
            completion.choices[0]?.message.content ?? "Unexpected OpenAI response"
          );
        } else {
          return "Add OPENAI_API_KEY environment variable to get AI responses.";
        }
      });

      const newMessage = await step.run("step/add-typos-to-notes", async () => {
        return await prisma.notes.update({
          where: {
            xata_id: note.xata_id,
          },
          data: {
            typos: typos.replace('```json', '').replace('```', ''),
          },
        });
      });

      return { event, body: `Typos ${typos} added to note with ID: ${note.xata_id}` };
    }
  );

  return [findTypos];
};
