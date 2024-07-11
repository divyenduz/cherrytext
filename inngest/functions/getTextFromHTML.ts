import { getInngestClient } from "inngest/client";
import OpenAI from "openai";
import { stripHtml } from "string-strip-html";
import { getFindTyposFn } from "./findTypos";

export function getGetTextFromHTMLFn(
  inngest: ReturnType<typeof getInngestClient>,
  env: Env
) {
  return inngest.createFunction(
    { id: "get-text-from-html" },
    { event: "app/get-text-from-html" },
    async ({ event, step, prisma }) => {
      const { id } = event.data;
      const note = await prisma.notes.findUnique({
        where: { xata_id: id },
      });

      if (!note) {
        return;
      }

      let inngest_run_status = note.inngest_run_status;

      const html = await step.run("step/get-html-from-url", async () => {
        const r = await fetch(note.url, {});
        const html = await r.text();
        return html;
      });

      const text = await step.run("step/get-text-from-html", async () => {
        const text = stripHtml(html).result;
        return text;
      });

      const updatedNote = await step.run("step/add-text-to-note", async () => {
        await prisma.notes.update({
          where: {
            xata_id: note.xata_id,
          },
          data: {
            inngest_run_status: inngest_run_status + "." + "HTML_ADDED",
            note_html: {
              update: {
                data: {
                  html,
                  text,
                },
              },
            },
          },
        });
      });

      const invokeFindTypos = await step.invoke("app/find-typos", {
        function: getFindTyposFn(inngest, env),
        data: { id: note.xata_id },
      });

      return { event, body: `Text added to note with ID: ${note.xata_id}` };
    }
  );
}
