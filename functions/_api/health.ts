export function onRequest() {
  return new Response("ok")
}

export const onRequestHealth = onRequest