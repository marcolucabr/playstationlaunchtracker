import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  validateProductPage,
  validateCandidate,
  type ProductLite,
} from "./collector-validation";

const WOLVERINE_PS5: ProductLite = {
  name: "Marvel's Wolverine",
  ean: "0711719571766",
  platform: "PS5",
};

// --- HTML fixtures -------------------------------------------------------
// Each fixture mimics what Amazon / a generic retailer would actually
// render for the given product type.

const BOOK_PAGE_HTML = `<!doctype html><html><head>
  <title>Wolverine: The Ultimate Guide to the Best There Is - Amazon.com.br</title>
</head><body>
  <h1>Wolverine: The Ultimate Guide to the Best There Is</h1>
  <p>by Amy Richau (Author)</p>
  <p>Hardcover book - 256 pages - DK Publishing</p>
  <p>Livro em inglês sobre a história do Wolverine nos quadrinhos da Marvel.</p>
  <p>ISBN-10: 0744084997</p>
</body></html>`;

const ACCESSORY_PAGE_HTML = `<!doctype html><html><head>
  <title>Capa Case Skin Adesivo Wolverine para Controle PS5 DualSense</title>
</head><body>
  <h1>Skin Adesivo Wolverine - Controle PS5 DualSense</h1>
  <p>Capa case decorativa para o seu controle do PlayStation 5.</p>
  <p>Acessório - não acompanha o controle nem o jogo.</p>
</body></html>`;

const GAME_PAGE_HTML = `<!doctype html><html><head>
  <title>Marvel's Wolverine - PlayStation 5 - Sony Interactive Entertainment</title>
</head><body>
  <h1>Marvel's Wolverine (PS5)</h1>
  <p>Plataforma: PlayStation 5</p>
  <p>Desenvolvido pela Insomniac Games. Edição padrão em mídia física.</p>
  <p>EAN: 0711719571766</p>
  <p>Indisponível no momento - sem previsão de chegada.</p>
</body></html>`;

const GAME_PAGE_NO_EAN_HTML = `<!doctype html><html><head>
  <title>Marvel's Wolverine - PS5 - Pré-venda</title>
</head><body>
  <h1>Marvel's Wolverine para PlayStation 5</h1>
  <p>Jogo de ação em mundo aberto da Insomniac. Mídia física PS5.</p>
</body></html>`;

// --- Heuristic-only tests -----------------------------------------------

describe("validateProductPage (heuristic)", () => {
  it("rejects a book page that shares the franchise name", () => {
    const r = validateProductPage(BOOK_PAGE_HTML, WOLVERINE_PS5);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/platform/i);
  });

  it("accepts a PS5 game page by EAN match", () => {
    const r = validateProductPage(GAME_PAGE_HTML, WOLVERINE_PS5);
    expect(r.ok).toBe(true);
  });

  it("accepts a PS5 game page by platform + name tokens (no EAN on page)", () => {
    const r = validateProductPage(GAME_PAGE_NO_EAN_HTML, WOLVERINE_PS5);
    expect(r.ok).toBe(true);
  });

  it("accepts an accessory page on heuristic (mentions PS5 + name) — AI must catch it", () => {
    // Heuristic alone is intentionally permissive: the accessory page does
    // mention the platform and the product name, so the heuristic passes.
    // The AI gate is what rejects it (covered below).
    const r = validateProductPage(ACCESSORY_PAGE_HTML, WOLVERINE_PS5);
    expect(r.ok).toBe(true);
  });
});

// --- Combined heuristic + AI tests --------------------------------------

function mockAiResponse(payload: { match: boolean; kind: string; reason: string }) {
  const fetchMock = vi.fn(async () =>
    new Response(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(payload) } }],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("validateCandidate (heuristic + AI)", () => {
  beforeEach(() => {
    vi.stubEnv("LOVABLE_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("rejects the book page (heuristic short-circuits, AI not called)", async () => {
    const fetchMock = mockAiResponse({ match: true, kind: "game", reason: "n/a" });
    const r = await validateCandidate(BOOK_PAGE_HTML, WOLVERINE_PS5);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/heuristic/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects the accessory page via AI (heuristic passes, AI says accessory)", async () => {
    mockAiResponse({
      match: false,
      kind: "accessory",
      reason: "página de skin/capa para controle, não é o jogo",
    });
    const r = await validateCandidate(ACCESSORY_PAGE_HTML, WOLVERINE_PS5);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/AI\(accessory\)/);
  });

  it("accepts the PS5 game page (heuristic + AI both pass)", async () => {
    mockAiResponse({ match: true, kind: "game", reason: "jogo PS5 correto" });
    const r = await validateCandidate(GAME_PAGE_HTML, WOLVERINE_PS5);
    expect(r.ok).toBe(true);
    expect(r.reason).toMatch(/AI\(game\)/);
  });

  it("accepts an out-of-stock / pre-order PS5 game page", async () => {
    mockAiResponse({
      match: true,
      kind: "game",
      reason: "jogo correto, apenas indisponível/pré-venda",
    });
    const r = await validateCandidate(GAME_PAGE_NO_EAN_HTML, WOLVERINE_PS5);
    expect(r.ok).toBe(true);
  });

  it("rejects a funko page via AI even if name + platform appear", async () => {
    const funkoHtml = `<!doctype html><html><head>
      <title>Funko Pop! Marvel's Wolverine - Edição PS5</title>
    </head><body>
      <h1>Funko Pop! Wolverine - PS5 Edition</h1>
      <p>Boneco colecionável. Não é o jogo.</p>
    </body></html>`;
    mockAiResponse({ match: false, kind: "funko", reason: "boneco colecionável" });
    const r = await validateCandidate(funkoHtml, WOLVERINE_PS5);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/AI\(funko\)/);
  });
});
