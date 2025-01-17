import { getInngestClient } from "inngest/client";
import OpenAI from "openai";

export function getFindTyposFn(
  inngest: ReturnType<typeof getInngestClient>,
  env: Env
) {
  return inngest.createFunction(
    { id: "find-typos" },
    { event: "app/find-typos" },
    async ({ event, step, prisma }) => {
      const { id } = event.data;
      const note = await prisma.notes.findUnique({
        where: { xata_id: id },
      });

      if (!note) {
        console.log(`Note with ID ${id} not found`);
        return;
      }

      let inngest_run_status = note.inngest_run_status;

      const note_html = await prisma.note_html.findUnique({
        where: { note_id: id },
      });

      if (!note_html) {
        console.log(`Note HTML with ID ${id} not found`);
        return;
      }

      // You can execute code that interacts with external services
      // All code is retried automatically on failure
      // Read more about Inngest steps: https://www.inngest.com/docs/learn/inngest-steps
      const typos = await step.run("step/find-typos", async () => {
        if (env.OPENAI_API_KEY) {
          const openai = new OpenAI({
            apiKey: env.OPENAI_API_KEY,
          });
          const completion = await openai.chat.completions.create({
            messages: [
              {
                role: "system",
                content: `Please find typos in this text, look at only single words and never two or more words together. 
                      It can have combines words into a single word (aka keywords) like RoadmapPricingBlog, etc., these are not typos but must be read as 
                      Roadmap, Pricing, Blog and checked for typos in each individual word.
                      Return the response as a JSON array string so that it can be parsed with JSON.parse function.`,
              },
              { role: "user", content: note_html.text },
            ],
            model: "gpt-4-turbo",
          });
          return (
            completion.choices[0]?.message.content ??
            "Unexpected OpenAI response"
          );
        } else {
          return "Add OPENAI_API_KEY environment variable to get AI responses.";
        }
      });

      const updatedNote = await step.run("step/add-typos-to-note", async () => {
        return await prisma.notes.update({
          where: {
            xata_id: note.xata_id,
          },
          data: {
            typos: typos.replace("```json", "").replace("```", ""),
            inngest_run_status: inngest_run_status + "." + "TYPOS_ADDED",
          },
        });
      });

      return {
        event,
        body: `Typos ${typos} added to note with ID: ${note.xata_id}`,
      };
    }
  );
}
