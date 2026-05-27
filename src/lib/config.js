/**
 * Centralized configuration for the AI Character Studio application.
 */

const CHARACTER_PRESETS = [
  { id: "eldrin", name: "Eldrin the Wise", backstory: "An ancient elven archmage who has studied cosmic ley lines for over three centuries. Speaking in riddles but possessing boundless arcane wisdom, Eldrin is polite, intellectual, and cautious.", style: "cinematic", personality: "enigmatic" },
  { id: "nova", name: "Nova-7 Cyborg", backstory: "A freelance cyberpunk street runner from Neo-Seoul. Equipped with neural-link processors and a dry, sarcastic humor, Nova is highly intelligent, hyper-vigilant, and fiercely independent.", style: "cyberpunk", personality: "witty" },
  { id: "elena", name: "Dr. Elena Vance", backstory: "A passionate interstellar astrobiologist and spaceship navigator. Empathetic, logical, and highly adventurous, she loves sharing stories about strange alien flora and foreign solar systems.", style: "digital_art", personality: "empathetic" },
  { id: "lilith", name: "Lilith the Rogue", backstory: "A charismatic medieval shadow assassin who operates in royal court networks. Seductive, chaotic, quick-witted, and dangerous, she values gold, secrets, and fine daggers.", style: "anime", personality: "chaotic" },
  { id: "custom", name: "Custom Persona", backstory: "Describe your own original character backstory here...", style: "pixar", personality: "friendly" },
];

const VISUAL_STYLES = [
  { id: "anime", name: "Anime Portrait", emoji: "🌸", promptPart: "breathtaking anime key visual style, vibrant cel-shaded color palette, dynamic lighting, expressive eyes, digital masterpiece illustration" },
  { id: "cinematic", name: "Cinematic Portrait", emoji: "🎬", promptPart: "photorealistic epic cinematic character portrait, 8k resolution, volumetric dramatic lighting, photoreal skin texture, highly detailed studio grade shot" },
  { id: "cyberpunk", name: "Cyberpunk Portrait", emoji: "⚡", promptPart: "cyberpunk neon glowing portrait, high-tech interface overlay, rain-soaked streets reflection, sharp details, futuristic character art style" },
  { id: "pixar", name: "3D Pixar Avatar", emoji: "🧸", promptPart: "charming 3D animated character avatar, pixar style, soft clay rendering, claymation details, warm volumetric lighting, adorable features" },
  { id: "oil_painting", name: "Oil Painting", emoji: "🎨", promptPart: "classical oil painting character portrait, textured canvas paint strokes, dark baroque chiaroscuro lighting style, museum masterpiece quality" },
  { id: "digital_art", name: "Digital Concept Art", emoji: "🌌", promptPart: "stunning digital fantasy character concept art, ethereal brush strokes, mystical backlighting, highly stylized, artstation trending style" },
];

const PERSONALITIES = [
  { id: "witty", name: "Witty & Sarcastic", emoji: "🎭", promptPart: "highly clever, quick-witted, sarcastic, responds with humorous dry remarks, playful banter" },
  { id: "enigmatic", name: "Enigmatic & Stoic", emoji: "🔮", promptPart: "mysterious, calm, speaking in deep philosophical riddles, highly intellectual, stoic, guarded" },
  { id: "empathetic", name: "Kind & Empathetic", emoji: "💖", promptPart: "incredibly warm, supportive, empathetic, active listener, offers comfort and genuine friendly advice" },
  { id: "authoritative", name: "Authoritative & Stern", emoji: "👑", promptPart: "regal, stern, speaking with absolute confidence and command, strict business-like leadership tone" },
  { id: "friendly", name: "Adventurous & Cheerful", emoji: "⛺", promptPart: "high-energy, optimistic, excited, loves discussing outdoors, exploration, positive and happy tone" },
  { id: "chaotic", name: "Chaotic & Mystical", emoji: "🔥", promptPart: "unpredictable, magical, whimsical, speaking with high curiosity and chaotic energy, slightly mischievous" },
];

const config = {
  auth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    secret: process.env.NEXTAUTH_SECRET,
    url: process.env.NEXTAUTH_URL || "http://localhost:3000",
    webhook_url: process.env.WEBHOOK_URL || process.env.NEXTAUTH_URL || "http://localhost:3000",
  },
  stripe: {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    plans: {
      basic: {
        id: "basic",
        name: "Basic Pack",
        credits: 1000,
        price: 500,
        description: "1,000 Credits — generate up to 55 premium AI characters.",
      },
      standard: {
        id: "standard",
        name: "Standard Pack",
        credits: 2000,
        price: 1000,
        description: "2,000 Credits — generate up to 110 premium AI characters.",
      },
      pro: {
        id: "pro",
        name: "Pro Pack",
        credits: 4000,
        price: 2000,
        description: "4,000 Credits — generate up to 220 premium AI characters.",
      },
      business: {
        id: "business",
        name: "Business Pack",
        credits: 10000,
        price: 5000,
        description: "10,000 Credits — generate up to 550 premium AI characters.",
      },
    },
  },
  ai: {
    apiKey: process.env.MU_API_KEY,
    pollEndpoint: (requestId) =>
      `https://api.muapi.ai/api/v1/predictions/${requestId}/result`,
    model: {
      id: "character-studio",
      name: "AI Character Model",
      creditCost: 18, // Charged 18 credits per character studio compiles
      imageEndpoint: "https://api.muapi.ai/api/v1/predictions",
      textEndpoint: "https://api.muapi.ai/api/v1/any-llm-models",
      description: "Generates stunning custom avatar portraits and synthesizes highly-consistent persona chat prompts.",
    },
    presets: CHARACTER_PRESETS,
    styles: VISUAL_STYLES,
    personalities: PERSONALITIES,
  },
  db: {
    url: process.env.DATABASE_URL,
  },
};

export default config;
export { CHARACTER_PRESETS, VISUAL_STYLES, PERSONALITIES };
