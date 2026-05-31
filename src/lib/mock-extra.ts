// Dados mockados para validar layout das novas abas (Marketplace, Cupom, Tendências).
// Substituir por coleta real (Firecrawl) no Sprint 1 final.

export const PRESALE_START_ISO = "2026-06-02T22:00:00.000Z"; // 02/06 19h BRT (UTC-3)
export const RELEASE_DATE_ISO = "2026-10-31T03:00:00.000Z"; // placeholder — confirmar

export type MarketplaceSeller = {
  seller: string;
  authorized: boolean;
  price_avista_cents: number;
  installments: string;
  shipping: "gratis" | "pago" | "full" | "prime";
  rating: number; // 0-5
  reviews: number;
  stock: "alto" | "medio" | "baixo" | "sem";
  listing_age_days: number;
  is_buybox?: boolean;
  buybox_reasons?: string[];
  url?: string;
};

export type MarketplaceRetailer = {
  retailer_id: string;
  retailer_name: string;
  total_sellers: number;
  authorized_count: number;
  unauthorized_count: number;
  sellers: MarketplaceSeller[];
  buybox_history_24h: Array<{ seller: string; hours: number; authorized: boolean }>;
};

export const marketplaceMock: MarketplaceRetailer[] = [
  {
    retailer_id: "mercadolivre",
    retailer_name: "Mercado Livre",
    total_sellers: 12,
    authorized_count: 3,
    unauthorized_count: 9,
    buybox_history_24h: [
      { seller: "PlayLoja Oficial", hours: 18, authorized: true },
      { seller: "GameImport SP", hours: 4, authorized: false },
      { seller: "MegaGames", hours: 2, authorized: false },
    ],
    sellers: [
      {
        seller: "PlayLoja Oficial",
        authorized: true,
        price_avista_cents: 38990,
        installments: "12x R$ 32,49 sem juros",
        shipping: "full",
        rating: 4.9,
        reviews: 18230,
        stock: "alto",
        listing_age_days: 60,
        is_buybox: true,
        buybox_reasons: [
          "MercadoLivre Full (entrega 1 dia)",
          "MercadoLíder Platinum",
          "Frete grátis",
          "Reputação 4.9 (18k+ vendas)",
          "Preço competitivo (top 3)",
        ],
      },
      {
        seller: "GameImport SP",
        authorized: false,
        price_avista_cents: 33990,
        installments: "10x R$ 33,99",
        shipping: "pago",
        rating: 4.1,
        reviews: 450,
        stock: "medio",
        listing_age_days: 8,
      },
      {
        seller: "MegaGames",
        authorized: false,
        price_avista_cents: 35490,
        installments: "12x R$ 29,57",
        shipping: "gratis",
        rating: 4.4,
        reviews: 1230,
        stock: "alto",
        listing_age_days: 22,
      },
    ],
  },
  {
    retailer_id: "shopee",
    retailer_name: "Shopee",
    total_sellers: 9,
    authorized_count: 1,
    unauthorized_count: 8,
    buybox_history_24h: [
      { seller: "ShopGames Oficial", hours: 10, authorized: true },
      { seller: "ImportZone", hours: 8, authorized: false },
      { seller: "BR Games Express", hours: 6, authorized: false },
    ],
    sellers: [
      {
        seller: "Webfones",
        authorized: true,
        price_avista_cents: 37990,
        installments: "10x R$ 37,99 sem juros",
        shipping: "gratis",
        rating: 4.8,
        reviews: 8420,
        stock: "alto",
        listing_age_days: 35,
        is_buybox: true,
        buybox_reasons: [
          "Único seller autorizado na Shopee",
          "Frete grátis com cupom da plataforma",
          "Reputação 4.8 (8k+ avaliações)",
          "Cashback Shopee 5%",
        ],
      },
      {
        seller: "ImportZone",
        authorized: false,
        price_avista_cents: 31990,
        installments: "12x R$ 26,66",
        shipping: "gratis",
        rating: 4.0,
        reviews: 230,
        stock: "baixo",
        listing_age_days: 4,
      },
      {
        seller: "BR Games Express",
        authorized: false,
        price_avista_cents: 32990,
        installments: "10x R$ 32,99",
        shipping: "pago",
        rating: 3.7,
        reviews: 67,
        stock: "medio",
        listing_age_days: 9,
      },
      {
        seller: "PlayHouse Imports",
        authorized: false,
        price_avista_cents: 34490,
        installments: "10x R$ 34,49",
        shipping: "gratis",
        rating: 4.2,
        reviews: 540,
        stock: "alto",
        listing_age_days: 18,
      },
    ],
  },
  {
    retailer_id: "amazon",
    retailer_name: "Amazon",
    total_sellers: 7,
    authorized_count: 2,
    unauthorized_count: 5,
    buybox_history_24h: [
      { seller: "Amazon.com.br", hours: 14, authorized: true },
      { seller: "GameStop BR", hours: 6, authorized: false },
      { seller: "TechZone", hours: 4, authorized: false },
    ],
    sellers: [
      {
        seller: "Amazon.com.br",
        authorized: true,
        price_avista_cents: 39990,
        installments: "10x R$ 39,99 sem juros",
        shipping: "prime",
        rating: 4.9,
        reviews: 21450,
        stock: "alto",
        listing_age_days: 45,
        is_buybox: true,
        buybox_reasons: [
          "Menor preço à vista",
          "Frete Prime grátis",
          "Reputação 4.9 (21k+ reviews)",
          "Estoque alto",
          "Listing oficial mais antigo",
        ],
      },
      {
        seller: "GameStop BR",
        authorized: false,
        price_avista_cents: 37990,
        installments: "12x R$ 31,66",
        shipping: "gratis",
        rating: 4.2,
        reviews: 312,
        stock: "medio",
        listing_age_days: 12,
      },
      {
        seller: "TechZone",
        authorized: false,
        price_avista_cents: 36490,
        installments: "10x R$ 36,49",
        shipping: "pago",
        rating: 3.8,
        reviews: 87,
        stock: "baixo",
        listing_age_days: 5,
      },
      {
        seller: "Saraiva Games",
        authorized: true,
        price_avista_cents: 41990,
        installments: "10x R$ 41,99 sem juros",
        shipping: "gratis",
        rating: 4.7,
        reviews: 4521,
        stock: "alto",
        listing_age_days: 30,
      },
      {
        seller: "Importa Tudo",
        authorized: false,
        price_avista_cents: 32990,
        installments: "à vista",
        shipping: "pago",
        rating: 3.1,
        reviews: 23,
        stock: "baixo",
        listing_age_days: 2,
      },
    ],
  },
  {
    retailer_id: "magalu",
    retailer_name: "Magalu",
    total_sellers: 4,
    authorized_count: 1,
    unauthorized_count: 3,
    buybox_history_24h: [
      { seller: "Magalu (1P)", hours: 20, authorized: true },
      { seller: "GameWorld", hours: 4, authorized: false },
    ],
    sellers: [
      {
        seller: "Magalu (1P)",
        authorized: true,
        price_avista_cents: 39990,
        installments: "10x R$ 39,99 sem juros",
        shipping: "gratis",
        rating: 4.6,
        reviews: 9540,
        stock: "alto",
        listing_age_days: 50,
        is_buybox: true,
        buybox_reasons: [
          "Venda e entrega Magalu (1P)",
          "Frete grátis para todo Brasil",
          "Parcelamento sem juros",
          "Estoque alto",
          "Cupom PIX10 aplicável",
        ],
      },
      {
        seller: "GameWorld",
        authorized: false,
        price_avista_cents: 34990,
        installments: "10x R$ 34,99",
        shipping: "pago",
        rating: 3.9,
        reviews: 145,
        stock: "baixo",
        listing_age_days: 6,
      },
    ],
  },
  {
    retailer_id: "kabum",
    retailer_name: "KaBuM!",
    total_sellers: 1,
    authorized_count: 1,
    unauthorized_count: 0,
    buybox_history_24h: [{ seller: "KaBuM! (1P)", hours: 24, authorized: true }],
    sellers: [
      {
        seller: "KaBuM! (1P)",
        authorized: true,
        price_avista_cents: 38490,
        installments: "12x R$ 32,07 sem juros",
        shipping: "gratis",
        rating: 4.8,
        reviews: 6720,
        stock: "alto",
        listing_age_days: 40,
        is_buybox: true,
        buybox_reasons: [
          "Único vendedor (1P)",
          "Menor preço do mercado",
          "Frete grátis acima de R$ 199",
          "Cupom KABUM5 ativo",
        ],
      },
    ],
  },
];

// ===== Cupons =====
export type Coupon = {
  id: string;
  retailer_id: string;
  retailer_name: string;
  code: string;
  description: string;
  discount_pct?: number;
  discount_cents?: number;
  starts_at: string;
  expires_at: string;
  active: boolean;
  applies_to_product: boolean;
  effective_price_cents?: number;
  triggers_map_violation: boolean;
  source: "homepage" | "carrinho" | "newsletter" | "influencer" | "app";
};

export const couponsMock: Coupon[] = [
  {
    id: "c1",
    retailer_id: "magalu",
    retailer_name: "Magalu",
    code: "PIX10",
    description: "10% off no PIX em games selecionados",
    discount_pct: 10,
    starts_at: "2026-05-28T03:00:00Z",
    expires_at: "2026-06-04T03:00:00Z",
    active: true,
    applies_to_product: true,
    effective_price_cents: 35991,
    triggers_map_violation: true,
    source: "homepage",
  },
  {
    id: "c2",
    retailer_id: "amazon",
    retailer_name: "Amazon",
    code: "BEMVINDO15",
    description: "15% para primeira compra (cap R$ 50)",
    discount_pct: 15,
    starts_at: "2026-05-20T03:00:00Z",
    expires_at: "2026-06-15T03:00:00Z",
    active: true,
    applies_to_product: true,
    effective_price_cents: 34990,
    triggers_map_violation: true,
    source: "app",
  },
  {
    id: "c3",
    retailer_id: "kabum",
    retailer_name: "KaBuM!",
    code: "KABUM5",
    description: "5% off em jogos PS5",
    discount_pct: 5,
    starts_at: "2026-05-30T03:00:00Z",
    expires_at: "2026-06-10T03:00:00Z",
    active: true,
    applies_to_product: true,
    effective_price_cents: 36565,
    triggers_map_violation: false,
    source: "homepage",
  },
  {
    id: "c4",
    retailer_id: "mercadolivre",
    retailer_name: "Mercado Livre",
    code: "GAMER20",
    description: "R$ 20 off acima de R$ 300",
    discount_cents: 2000,
    starts_at: "2026-05-25T03:00:00Z",
    expires_at: "2026-06-02T22:00:00Z",
    active: true,
    applies_to_product: true,
    effective_price_cents: 36990,
    triggers_map_violation: true,
    source: "newsletter",
  },
  {
    id: "c5",
    retailer_id: "amazon",
    retailer_name: "Amazon",
    code: "PRIMEDAY",
    description: "Encerrado — Prime Day antecipado",
    discount_pct: 12,
    starts_at: "2026-05-10T03:00:00Z",
    expires_at: "2026-05-15T03:00:00Z",
    active: false,
    applies_to_product: false,
    triggers_map_violation: false,
    source: "homepage",
  },
];

// ===== Tendências =====
export type TrendPoint = { date: string; value: number };
export type TrendSource = {
  source: "google_trends" | "youtube" | "reddit" | "tiktok";
  source_name: string;
  current_score: number; // 0-100
  delta_7d_pct: number;
  series: TrendPoint[];
  top_items?: Array<{ title: string; author: string; metric: string; url?: string }>;
};

const days = (n: number) =>
  Array.from({ length: n }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });

export const trendsMock: TrendSource[] = [
  {
    source: "google_trends",
    source_name: "Google Trends — BR",
    current_score: 78,
    delta_7d_pct: 34.5,
    series: days(14).map((date, i) => ({
      date,
      value: Math.round(30 + i * 3.5 + Math.sin(i) * 6),
    })),
  },
  {
    source: "youtube",
    source_name: "YouTube — últimas 24h",
    current_score: 64,
    delta_7d_pct: 89.2,
    series: days(14).map((date, i) => ({ date, value: Math.round(10 + i * 4) })),
    top_items: [
      { title: "Wolverine PS5: Tudo que sabemos do lançamento", author: "BJ Gamer", metric: "412k views" },
      { title: "REACT: Trailer final de Wolverine [PS5]", author: "GameVicio", metric: "287k views" },
      { title: "GAMEPLAY VAZADA?! Wolverine PS5 análise", author: "Coisa de Nerd", metric: "198k views" },
    ],
  },
  {
    source: "reddit",
    source_name: "Reddit — r/PS5BR + r/gamesEcultura",
    current_score: 52,
    delta_7d_pct: 22.1,
    series: days(14).map((date, i) => ({ date, value: Math.round(8 + i * 1.5) })),
    top_items: [
      { title: "Alguém mais ansioso pelo Wolverine? Preço tá bom?", author: "u/playstation_br", metric: "342 upvotes" },
      { title: "Comparativo: pré-venda Wolverine x Spider-Man 2", author: "u/insomniac_fan", metric: "210 upvotes" },
    ],
  },
  {
    source: "tiktok",
    source_name: "TikTok — #wolverineps5",
    current_score: 71,
    delta_7d_pct: 156.8,
    series: days(14).map((date, i) => ({ date, value: Math.round(5 + i * 5.2) })),
    top_items: [
      { title: "POV: você comprou Wolverine na pré-venda", author: "@gamerzn", metric: "1.2M views" },
      { title: "Top 5 motivos para jogar Wolverine", author: "@playstation.br", metric: "890k views" },
    ],
  },
];
