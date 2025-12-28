import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PitchDeck, PitchTemplateId, VisualStyleId, Language, LANGUAGES, BrandIdentity } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Strict slide structures based on real-world documentation
const TEMPLATE_STRUCTURES: Record<PitchTemplateId, string[]> = {
  sequoia: [
    "Company Purpose: Define the company/business in a single declarative sentence.",
    "Problem: Describe the pain of the customer. How is this addressed today?",
    "Solution: Value proposition. Where your product sits. Provide use cases.",
    "Why Now: Historical evolution of category. Recent trends making this possible.",
    "Market Size: Profile the customer. Calculate TAM (top down), SAM (bottoms up), and SOM.",
    "Competition: List competitors and competitive advantages.",
    "Product: Line-up, form factor, functionality, features, IP, roadmap.",
    "Business Model: Revenue model, pricing, average account size/LTV, sales & distribution.",
    "Team: Founders, Management, Board of Directors/Advisors.",
    "Financials: P&L, Balance sheet, Cash flow, Cap table, The deal."
  ],
  yc: [
    "Title: Company name and one-line description.",
    "Problem: The specific problem you are solving.",
    "Solution: How you solve it.",
    "Traction: Growth metrics, revenue, active users. (This is key for YC).",
    "Unique Insight: What do you know that others don't? (The 'Secret').",
    "Market: How big is the opportunity?",
    "Competition: Why you win.",
    "Business Model: How you make money.",
    "Team: Why you?",
    "Ask: What do you need?"
  ],
  kawasaki: [
    "Title: Company name, your name, contact info.",
    "Problem/Opportunity: The pain you alleviate or pleasure you provide.",
    "Value Proposition: The value of the pain alleviated.",
    "Underlying Magic: Technology, secret sauce, or magic behind the product.",
    "Business Model: Who has your money and how you get it.",
    "Go-To-Market Plan: How to reach customers without breaking the bank.",
    "Competitive Analysis: Complete view of competitive landscape.",
    "Team: Key players, investors, advisors.",
    "Financial Projections: 3-year forecast, metrics (bottom-up).",
    "Status/Timeline: Current status, accomplishments, timeline, use of funds."
  ],
  "500startups": [
    "Logo & Elevator Pitch: Product type, target customer, problem, benefit, secret sauce.",
    "The Problem: From the customer's point of view.",
    "Your Solution: Product key features and top benefits.",
    "How it Works: User experience, tech, proprietary differentiation.",
    "Traction: User or revenue growth (MRR, GMV, MoM).",
    "Business Model: Top sources of revenue (Direct vs Indirect).",
    "Competition: How you are different. (Quadrant chart concept).",
    "The Market Opportunity: Market size >$1B (Top Down or Bottom Up).",
    "Progress to Date: Launch date, first customer, key milestones.",
    "The Team: Founders' unfair advantage (Experience, Product, Industry, Sales)."
  ],
  unusual: [
    "Opening Gambit: Human story about the problem/benefit. Hook the listener.",
    "Team: Why this group is uniquely qualified.",
    "Problem Statement: Zoom out to greater trend, zoom in to pain.",
    "Market: TAM/SAM (Billions). Bottoms-up analysis.",
    "Solution: The 'Vision' and what is unique/defensible.",
    "Competition: 2x2 matrix or Harvey ball chart criteria.",
    "Go To Market: Beachhead use case. Target user/buyer.",
    "Traction: Customer conversations, POCs, or Product Market Fit evidence.",
    "Operating Plan & Financials: Execution goals for next 24 months (headcount, product, burn)."
  ],
  soma: [
    "Title: 'A Revolution In...'. High level quotes/endorsements.",
    "The Problem/Solution: Break the main barrier. Explain the unique insight (e.g. Psychology of use).",
    "The Team: Proven exits, specific relevant experience, board members.",
    "The Product: Unit Economics (Cost vs Price vs Margin), status of manufacturing.",
    "The Market (User Base): Growing population, relevant demographic trends.",
    "The Market (Opportunity): Total spend, average price point, existing competitor weakness.",
    "Barriers To Entry & Sales Plan: IP/Patents, Endorsements, Distribution channels.",
    "Funding History & Use of Proceeds: Previous rounds, ideal investor profile, current cash/runway.",
    "Future Prospects & Vision: How the product becomes a platform/company (Expansion).",
    "Financial Model: Key assumptions and projections."
  ],
  intercom: [
    "Title: Logo and minimalist branding.",
    "The Team: Founders' roles, past exits/companies, expertise.",
    "The Problem: Why the current way is hard/impossible. (e.g. 'Current tools are broken').",
    "The Solution: Simple install. Key features list (browsing, research, messaging).",
    "The Market: Current market size vs Future market expansion.",
    "Landscape / Competitors: List competitors by category (Social, Support, Email, Analytics).",
    "Progress: Development timeline, Beta status, Testimonials/Tweets.",
    "What We're Looking For: Funding amount, runway goals (PMF, Dev, Profitability)."
  ],
  khosla: [
    "Title: Declarative statement explaining company mission. (e.g. 'We revolutionize X').",
    "The Problem: Focus on the 'Visceral Punch'. Use emotion. Why is this hard?",
    "Reasons to Invest: State 3-5 major takeaways upfront. (Greed, Advantage, Market).",
    "The Solution: Don't obscure tech. Highlight the 10,000x enhancement.",
    "Market: Bottom-up analysis only. No top-down vanity metrics.",
    "Competition: Show advantage clearly (e.g. '96% lower cost').",
    "Team: Emphasize unique advantages/experience. Don't just list logos.",
    "Risk Mitigation: Address investor fears directly (Tech, Market, Execution risks).",
    "Financials: Clearly layout financials. Less is more (7 rows max).",
    "The Ask: Funding history, milestones, and use of proceeds."
  ],
  canonical: [
    "Cover Slide: Contact info, tagline. Mission accomplished statement.",
    "Mission/Vision: What problem are you solving and for whom? (Achievable but not yet achieved).",
    "Market/Problem: Emphasize the pain level. Why incumbents fail.",
    "Product/Solution: The benefits that address the pain. Don't get lost in features.",
    "Underlying Magic: The technology/methodology/patent. The 'Secret Sauce'.",
    "Target Customer: Who writes the check? Ideal customer profile.",
    "Value Proposition: ROI. Are you selling aspirin (need) or vitamins (nice-to-have)?",
    "Sales Strategy: CAC, LTV, distribution channels. How do you get customers?",
    "Management Team: Experience, missing pieces, advisors.",
    "Revenue Model: How you make money. Path to profitability.",
    "Competition: Landscape. Don't deny competitors exist. Why you are different.",
    "Status & Funding: Milestones achieved, metrics, and funding requirements."
  ]
};

export const PITCH_TEMPLATES: Record<PitchTemplateId, { name: string, description: string }> = {
  sequoia: {
    name: "Sequoia Capital",
    description: "The gold standard. Focuses on clarity, market size, and 'Why Now'. Perfect for Series A.",
  },
  yc: {
    name: "Y Combinator",
    description: "Traction-first. Concise. Focuses on 'Make something people want' and growth.",
  },
  kawasaki: {
    name: "Guy Kawasaki (10/20/30)",
    description: "10 slides, short and punchy. Focuses on 'Underlying Magic' and business model.",
  },
  "500startups": {
    name: "500 Startups",
    description: "Dave McClure style. Emphasizes Traction, Customer Acquisition, and Unfair Advantage.",
  },
  unusual: {
    name: "Unusual Ventures",
    description: "Story-driven. Starts with a 'Human Story' (Opening Gambit) and Team early on.",
  },
  soma: {
    name: "SOMA (Founders Fund)",
    description: "Hardware/Product focus. Heavily emphasizes Unit Economics, IP/Barriers, and future Vision.",
  },
  intercom: {
    name: "Intercom (Early Stage)",
    description: "SaaS focus. Problem/Solution clarity, Competitor Landscape, and Progress/Beta traction.",
  },
  khosla: {
    name: "Khosla Ventures",
    description: "High Emotion & Logic. 'Visceral Punch', Declarative Titles, Risk Mitigation.",
  },
  canonical: {
    name: "The Best Practice (Feld/Cowan)",
    description: "The universal consensus deck (10/20/30). Combines Feld, Cowan, and Kawasaki best practices.",
  }
};

export const VISUAL_STYLES: Record<VisualStyleId, { name: string, description: string, promptModifier: string }> = {
  corporate: {
    name: "Executive / Fortune 500",
    description: "Trustworthy, established, clean. Think consulting firms or major banks.",
    promptModifier: "high-end corporate photography, clean office environments, glass and steel architecture, professional lighting, photorealistic, trust, executive style, 8k"
  },
  tech_minimal: {
    name: "Silicon Valley Minimalist",
    description: "Stripe/Apple aesthetic. Lots of whitespace, clean typography.",
    promptModifier: "silicon valley tech aesthetic, stripe style, clean white backgrounds, soft shadows, modern minimalism, high tech, premium product photography"
  },
  swiss: {
    name: "Swiss International",
    description: "Bold grid systems, strong typography, modernist.",
    promptModifier: "swiss international style, bauhaus influence, bold typography, grid systems, geometric shapes, clean lines, modernist architecture, muted but strong colors"
  },
  editorial: {
    name: "High-End Editorial",
    description: "Magazine quality. Focus on dramatic imagery and serif fonts.",
    promptModifier: "editorial fashion photography style, vogue aesthetic, dramatic lighting, high contrast, cinematic depth of field, award winning photography, emotive"
  },
  custom: {
    name: "Custom Style",
    description: "Define your own unique visual style.",
    promptModifier: "" // This is overridden by user input
  }
};

const DECK_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    companyName: { type: Type.STRING, description: "A catchy name for the startup" },
    tagline: { type: Type.STRING, description: "A punchy one-liner value prop" },
    title: { type: Type.STRING, description: "The title of the deck" },
    slides: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "DECLARATIVE Slide Headline. Do not use generic titles like 'Problem'. Use 'Diabetes is a Global Pandemic'." },
          bulletPoints: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "3-4 punchy, short bullet points. Be specific with numbers and strategy."
          },
          imagePrompt: { type: Type.STRING, description: "A detailed visual description for an AI image generator (NO TEXT IN IMAGE). Describe the scene, objects, or metaphor." },
          speakerNotes: { type: Type.STRING, description: "A script for the founder to say while presenting this slide." }
        },
        required: ["title", "bulletPoints", "imagePrompt", "speakerNotes"]
      }
    }
  },
  required: ["companyName", "tagline", "title", "slides"]
};

export const checkApiKey = async (): Promise<boolean> => {
  const win = window as any;
  if (win.aistudio && win.aistudio.hasSelectedApiKey) {
    return await win.aistudio.hasSelectedApiKey();
  }
  return false;
};

export const promptApiKeySelection = async (): Promise<void> => {
  const win = window as any;
  if (win.aistudio && win.aistudio.openSelectKey) {
    await win.aistudio.openSelectKey();
  } else {
    console.warn("AI Studio Key Selector not available.");
  }
};

export const generateDeckStructure = async (
  userIdea: string, 
  templateId: PitchTemplateId,
  styleId: VisualStyleId,
  language: Language,
  brand: BrandIdentity,
  customStylePrompt?: string,
): Promise<PitchDeck> => {
  const ai = getAI();
  const model = "gemini-3-pro-preview"; 

  const templateStructure = TEMPLATE_STRUCTURES[templateId];
  const style = VISUAL_STYLES[styleId];
  const langName = LANGUAGES[language];
  
  // Use custom prompt if selected, otherwise use the preset
  const visualPrompt = styleId === 'custom' && customStylePrompt ? customStylePrompt : style.promptModifier;

  // HUGELY IMPROVED PROMPT
  const SYSTEM_INSTRUCTION = `
    You are a legendary Silicon Valley Venture Capitalist and Pitch Deck Architect (Partner level at Sequoia/Khosla).
    
    OUTPUT LANGUAGE:
    All slide titles, bullet points, and speaker notes MUST be in ${langName}.
    
    BRAND COLORS:
    The user has a design system with Primary Color: ${brand.primaryColor} and Secondary Color: ${brand.secondaryColor}.
    If appropriate, incorporate color descriptions into the 'imagePrompt' that compliment these colors (e.g., if Primary is Blue, ask for 'cool tones' or 'blue accents').
    
    YOUR CORE PHILOSOPHY:
    1.  **VISCERAL PUNCH**: The Problem slide must evoke emotion. Don't just state facts; describe the pain.
    2.  **SELL ASPIRIN, NOT VITAMINS**: Ensure the value proposition is a "need to have", not a "nice to have".
    3.  **DECLARATIVE TITLES**: Never use generic slide titles like "The Market" or "Team". 
        BAD: "Market Size"
        GOOD: "A $50B Opportunity Growing at 20% YoY"
        BAD: "Competition"
        GOOD: "The Only Solution that is 10x Cheaper and Faster"
    4.  **BOTTOM-UP MARKETS**: Avoid generic "1% of China" market sizing. Use bottom-up logic (Users x Price).
    5.  **RISK MITIGATION**: Proactively address why this might fail and how you mitigate it.

    STRICT STRUCTURE REQUIREMENT:
    You MUST generate exactly ${templateStructure.length} slides.
    The slides MUST follow this exact order and content guide:
    ${JSON.stringify(templateStructure)}

    VISUAL STYLE:
    All image prompts must adhere to: ${visualPrompt}.
    Do NOT ask for text in the images.
    
    TASK:
    Transform the user's idea into a specific, high-quality pitch deck.
    Make the founder sound like a genius who has "done the work".
  `;

  const prompt = `
    Startup Idea: "${userIdea}"
    
    Generate the pitch deck now.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: DECK_SCHEMA,
    }
  });

  const text = response.text;
  if (!text) throw new Error("No text returned from Gemini");

  try {
    const data = JSON.parse(text) as PitchDeck;
    // Inject the brand identity into the deck object so the renderer can use it
    data.brand = brand;
    return mapDeckIds(data);
  } catch (e) {
    console.error("Failed to parse JSON", e);
    throw new Error("Failed to generate valid deck structure.");
  }
};

// -- EVIL VC LOGIC --

export const reviewPitchDeck = async (deck: PitchDeck, language: Language): Promise<string> => {
  const ai = getAI();
  const model = "gemini-3-pro-preview";
  const langName = LANGUAGES[language];

  const SYSTEM_INSTRUCTION = `
    You are an "Evil" Venture Capitalist. You are cynical, brutal, and have seen thousands of startups fail.
    
    OUTPUT LANGUAGE:
    The critique MUST be in ${langName}.
    
    CRITIQUE FRAMEWORK:
    1.  **The "So What?" Test**: Does the first slide hit me with a visceral punch?
    2.  **The Title Test**: Are the slide titles declarative sentences that tell the story on their own? If they are generic (e.g. "Problem"), ROAST THEM.
    3.  **The Vitamin Test**: Is this a vitamin (nice to have) or aspirin (pain killer)? If it's a vitamin, kill the deal.
    4.  **The "Google" Test**: Why won't Google/Apple/Amazon just crush them?
    5.  **The Bottom-Up Test**: Did they fake the market size with top-down BS?
    
    Your job is to rip the deck apart so we can rebuild it stronger. Be specific.
  `;

  const prompt = `
    Here is a pitch deck. ROAST IT.
    
    Deck: ${JSON.stringify(deck)}
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    }
  });

  return response.text || "This is trash.";
};

export const refinePitchDeck = async (
  originalDeck: PitchDeck, 
  critique: string,
  styleId: VisualStyleId,
  language: Language,
  customStylePrompt?: string
): Promise<PitchDeck> => {
  const ai = getAI();
  const model = "gemini-3-pro-preview";
  const style = VISUAL_STYLES[styleId];
  const langName = LANGUAGES[language];
  
  const visualPrompt = styleId === 'custom' && customStylePrompt ? customStylePrompt : style.promptModifier;

  const SYSTEM_INSTRUCTION = `
    You are a world-class Pitch Deck editor.
    You have just received BRUTAL feedback from an Evil VC.
    
    OUTPUT LANGUAGE:
    The refined deck MUST be in ${langName}.
    
    Your job is to rewrite the deck to FIX the issues identified.
    1.  **Upgrade Titles**: Make every slide title a declarative, powerful statement.
    2.  **Sharpen Value**: Ensure it sounds like a pain-killer (aspirin).
    3.  **Address Risks**: If the VC called out a risk, address it in the bullet points.
    4.  **Visuals**: Keep the visual prompts aligned with style: ${visualPrompt}.
    
    Return the full, updated JSON.
  `;

  const prompt = `
    Original Deck: ${JSON.stringify(originalDeck)}
    
    Evil VC Critique: ${critique}
    
    Re-generate the deck in JSON format.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: DECK_SCHEMA,
    }
  });

  const text = response.text;
  if (!text) throw new Error("No text returned from Gemini during refinement");

  try {
    const data = JSON.parse(text) as PitchDeck;
    // Preserve brand identity
    data.brand = originalDeck.brand;
    return mapDeckIds(data);
  } catch (e) {
    console.error("Failed to parse Refined JSON", e);
    return originalDeck; 
  }
};

const mapDeckIds = (data: PitchDeck): PitchDeck => {
  const slidesWithIds = data.slides.map((s, i) => ({
    ...s,
    id: `slide-${i}-${Date.now()}`,
    imageUrl: undefined
  }));
  return { ...data, slides: slidesWithIds };
};

export const generateSlideImage = async (prompt: string, styleId: VisualStyleId, customStylePrompt?: string): Promise<string> => {
  const ai = getAI();
  const model = "gemini-3-pro-image-preview";
  const style = VISUAL_STYLES[styleId];
  
  const visualPrompt = styleId === 'custom' && customStylePrompt ? customStylePrompt : style.promptModifier;
  const enhancedPrompt = `${prompt} . Style details: ${visualPrompt}. No text, no words, high quality render.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [{ text: enhancedPrompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K"
        }
      }
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Image generation failed:", error);
    return `https://picsum.photos/1280/720?random=${Math.floor(Math.random() * 1000)}`;
  }
};