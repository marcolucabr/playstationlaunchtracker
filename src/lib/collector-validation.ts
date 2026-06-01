/**
 * Pure validation helpers used by the collector to ensure a scraped
 * product page actually matches the target VIDEO GAME for the right
 * platform. Extracted into its own module so it can be unit-tested
 * without pulling in TanStack server-only imports.
 */

export type ProductLite = {
  id?: string;
  name: string;
  ean: string | null;
  platform: string | null;
};

const STOPWORDS = new Set([
  "the","of","for","and","with","a","an","de","da","do","das","dos","para","com","e","o","la","el",
  "marvel","marvels","sony","game","jogo","midia","midias","fisica","fisicas","edicao","edition","standard",
]);

const PLATFORM_SYNONYMS: Record<string, string[]> = {
  ps5: ["ps5", "playstation 5", "playstation5"],
  ps4: ["ps4", "playstation 4", "playstation4"],
  "playstation 5": ["ps5", "playstation 5", "playstation5"],
  "playstation 4": ["ps4", "playstation 4", "playstation4"],
  "xbox series x": ["xbox series x", "xbox series x|s", "series x"],
  switch: ["nintendo switch", "switch"],
  "nintendo switch": ["nintendo switch", "switch"],
};

const NEGATIVE_TOKENS = [
  "livro", "book", "guide", "guia", "funko", "boneco", "action figure",
  "camiseta", "t-shirt", "poster", "adesivo", "sticker",
  "capa case", "skin", "controle", "headset",
];

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function platformSynonyms(platform: string | null | undefined): string[] {
  if (!platform) return [];
  const n = normalizeText(platform);
  return PLATFORM_SYNONYMS[n] ?? [n];
}

export function nameTokens(name: string): string[] {
  return normalizeText(name)
    .split(" ")
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

/**
 * Heuristic validation. Cheap, runs first. Accepts when EAN matches OR
 * (platform synonym present AND >=2 name tokens). Rejects otherwise.
 */
export function validateProductPage(
  html: string,
  product: ProductLite,
): { ok: boolean; reason?: string } {
  const slice = html.slice(0, 200_000);
  const text = normalizeText(
    slice
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );

  if (product.ean && text.includes(product.ean.toLowerCase())) {
    return { ok: true };
  }

  const platToks = platformSynonyms(product.platform);
  const platformOk = platToks.length === 0 || platToks.some((t) => text.includes(t));
  if (!platformOk) {
    return { ok: false, reason: `platform "${product.platform}" not in page` };
  }

  const tokens = nameTokens(product.name);
  const required = Math.min(2, tokens.length);
  const matched = tokens.filter((t) => text.includes(t)).length;
  if (matched < required) {
    return { ok: false, reason: `name tokens ${matched}/${tokens.length}` };
  }

  if (!platformOk && NEGATIVE_TOKENS.some((t) => text.includes(t))) {
    return { ok: false, reason: "looks like merch/book, no platform" };
  }

  return { ok: true };
}

/**
 * AI validation via Lovable AI Gateway. Confirms the page is the target
 * VIDEO GAME (out-of-stock / pre-order still counts). Falls back to "ok"
 * if the gateway is unreachable so the collector keeps working.
 */
export async function aiValidateProductPage(
  html: string,
  product: ProductLite,
): Promise<{ ok: boolean; reason: string; kind: string }> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return { ok: true, reason: "AI disabled (no LOVABLE_API_KEY)", kind: "unknown" };

  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  const text = normalizeText(stripped).slice(0, 3500);
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = (titleMatch?.[1] ?? "").replace(/\s+/g, " ").trim().slice(0, 300);

  const system =
    "You validate whether an e-commerce product page is selling a specific VIDEO GAME for a specific console. Reply with JSON only.";
  const user = `Target product:
- Name: ${product.name}
- Platform: ${product.platform ?? "unknown"}
- EAN: ${product.ean ?? "n/a"}

Page <title>: ${title}
Page text (truncated): ${text}

Return strict JSON:
{"match": boolean, "kind": "game"|"book"|"guide"|"merch"|"accessory"|"funko"|"other", "reason": "short reason in pt-BR"}

Rules:
- "match" is TRUE only when the page sells the actual VIDEO GAME (physical or digital) for the given platform.
- A page that is out-of-stock, indisponível, pré-venda, or "sem previsão" is STILL a match if it is the correct game.
- A page for a book, guide, art book, poster, funko, apparel, controller, headset or any non-game item is NEVER a match, even if it shares the name.
- If the platform on the page does not match the target platform, "match" must be false.`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      return { ok: true, reason: `AI gateway ${res.status} (fallback accept)`, kind: "unknown" };
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as { match?: boolean; kind?: string; reason?: string };
    const kind = String(parsed.kind ?? "unknown");
    const ok = parsed.match === true && (kind === "game" || kind === "unknown");
    return { ok, reason: parsed.reason ?? (ok ? "ok" : "rejected by AI"), kind };
  } catch (e) {
    return {
      ok: true,
      reason: `AI exception: ${e instanceof Error ? e.message : String(e)} (fallback accept)`,
      kind: "unknown",
    };
  }
}

/**
 * Combined heuristic + AI validation. Heuristic runs first (cheap);
 * AI runs only when heuristic passes (saves tokens).
 */
export async function validateCandidate(
  html: string,
  product: ProductLite,
): Promise<{ ok: boolean; reason: string }> {
  const h = validateProductPage(html, product);
  if (!h.ok) return { ok: false, reason: `heuristic: ${h.reason}` };
  const ai = await aiValidateProductPage(html, product);
  if (!ai.ok) return { ok: false, reason: `AI(${ai.kind}): ${ai.reason}` };
  return { ok: true, reason: `AI(${ai.kind}): ${ai.reason}` };
}
