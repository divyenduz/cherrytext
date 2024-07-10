import { getInngestClient } from "./client";
import { getFindTyposFn } from "./functions/findTypos";
import { getGetTextFromHTMLFn } from "./functions/getTextFromHTML";

export const getFunctions = (env: Env) => {
  const inngest = getInngestClient(env);

  const findTypos = getFindTyposFn(inngest, env);
  const getTextFromHTML = getGetTextFromHTMLFn(inngest, env);

  return [findTypos, getTextFromHTML];
};
