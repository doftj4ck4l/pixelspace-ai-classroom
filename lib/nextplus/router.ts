/**
 * Nextplus model router client (OpenAI-compatible).
 * Credentials live in the environment only — never in the repo.
 */

const ROUTER_URL = (
  process.env.NEXTPLUS_ROUTER_URL ?? "https://router.pixel-space.co"
).replace(/\/+$/, "");

const routerKey = () => {
  const key = process.env.NEXTPLUS_ROUTER_KEY;
  if (!key) throw new Error("NEXTPLUS_ROUTER_KEY is not configured");
  return key;
};

export const IMAGE_MODEL =
  process.env.NEXTPLUS_IMAGE_MODEL ?? "nextplus-image-gen";

/** Generate one image and return its bytes (PNG/JPEG). */
export const generateImage = async (
  prompt: string,
): Promise<{ bytes: Buffer; mime: string }> => {
  const res = await fetch(`${ROUTER_URL}/v1/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${routerKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      n: 1,
      size: "1024x1024",
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `image generation failed (${res.status}): ${text.slice(0, 200)}`,
    );
  }
  const data = (await res.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };
  const first = data.data?.[0];
  if (first?.b64_json) {
    return { bytes: Buffer.from(first.b64_json, "base64"), mime: "image/png" };
  }
  if (first?.url) {
    const image = await fetch(first.url);
    if (!image.ok) throw new Error("could not download the generated image");
    return {
      bytes: Buffer.from(await image.arrayBuffer()),
      mime: image.headers.get("content-type") ?? "image/png",
    };
  }
  throw new Error("image generation returned no image");
};
