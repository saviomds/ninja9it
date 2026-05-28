/* ══════════════════════════════════════════
   NINJA9IT · Secure Local Data Store
   Replaces Supabase with a Secured JS Store
   ────────────────────────────────────────── */

const fs = require('fs');

const DATA = {
  categories: ['beers', 'spirits', 'wines', 'cocktails', 'softs'],

  categoryMeta: {
    beers:     { label: 'Beers',     emoji: '🍺', bg: 'linear-gradient(135deg,#f59e0b,#92400e)', accent: '#f59e0b' },
    spirits:   { label: 'Spirits',   emoji: '🥃', bg: 'linear-gradient(135deg,#7c3aed,#1e1b4b)', accent: '#7c3aed' },
    wines:     { label: 'Wines',     emoji: '🍷', bg: 'linear-gradient(135deg,#be123c,#4c0519)', accent: '#be123c' },
    cocktails: { label: 'Cocktails', emoji: '🍹', bg: 'linear-gradient(135deg,#0891b2,#083344)', accent: '#0891b2' },
    softs:     { label: 'Softs',     emoji: '🧃', bg: 'linear-gradient(135deg,#16a34a,#052e16)', accent: '#16a34a' },
  },

  items: {
    beers: [
      { id:'phoenix-beer',   name:'Phoenix Beer',    price:85,   tag:'🇲🇺 Local Legend', emoji:'🍺', gradient:'linear-gradient(135deg,#f59e0b,#92400e)', desc:"Mauritius' golden lager — the island's pride since 1963.", isLocal:true,  popular:true,  category:'beers' },
      { id:'blue-marlin',    name:'Blue Marlin',      price:95,   tag:'🇲🇺 Local',       emoji:'🍺', gradient:'linear-gradient(135deg,#0ea5e9,#075985)', desc:'Crisp Mauritian craft lager with a tropical finish.',              isLocal:true,  popular:false, category:'beers' },
      { id:'stella-artois',  name:'Stella Artois',    price:120,  tag:'Premium',         emoji:'🍺', gradient:'linear-gradient(135deg,#eab308,#713f12)', desc:'Belgian pilsner. Smooth, balanced, timeless.',                    isLocal:false, popular:true,  category:'beers' },
      { id:'heineken',       name:'Heineken',         price:115,  tag:'Import',          emoji:'🍺', gradient:'linear-gradient(135deg,#22c55e,#14532d)', desc:'Dutch premium lager. A world favourite.',                         isLocal:false, popular:false, category:'beers' },
      { id:'corona-extra',   name:'Corona Extra',     price:130,  tag:'Import',          emoji:'🍺', gradient:'linear-gradient(135deg,#fde047,#a16207)', desc:'Mexican pale lager — best with a wedge of lime.',                 isLocal:false, popular:false, category:'beers' },
      { id:'guinness',       name:'Guinness',         price:145,  tag:'Dark Stout',      emoji:'🍺', gradient:'linear-gradient(135deg,#44403c,#0c0a09)', desc:'Irish dry stout with rich roasted depth.',                        isLocal:false, popular:false, category:'beers' },
    ],
    spirits: [
      { id:'green-island-rum', name:'Green Island Rum',   price:450,  tag:'🇲🇺 Local',       emoji:'🥃', gradient:'linear-gradient(135deg,#22c55e,#92400e)', desc:'Smooth Mauritian white rum — legendary on the island.',                      isLocal:true,  popular:true,  category:'spirits' },
      { id:'chamarel-rum',     name:'Chamarel Rum',        price:780,  tag:'🇲🇺 Premium',     emoji:'🥃', gradient:'linear-gradient(135deg,#a16207,#422006)', desc:'Award-winning aged rum from the hills of Chamarel.',                         isLocal:true,  popular:true,  category:'spirits' },
      { id:'grey-goose',       name:'Grey Goose Vodka',    price:1450, tag:'Premium Vodka',   emoji:'🍸', gradient:'linear-gradient(135deg,#94a3b8,#1e293b)', desc:'French ultra-premium vodka. Pure, smooth, refined.',                         isLocal:false, popular:true,  category:'spirits' },
      { id:'jameson',          name:'Jameson',             price:1100, tag:'Irish Whiskey',   emoji:'🥃', gradient:'linear-gradient(135deg,#f59e0b,#78350f)', desc:'Triple-distilled Irish whiskey. Smooth and versatile.',                      isLocal:false, popular:true,  category:'spirits' },
      { id:'chivas-regal',     name:'Chivas Regal 12',     price:1800, tag:'Scotch Whisky',   emoji:'🥃', gradient:'linear-gradient(135deg,#dc2626,#1c1917)', desc:'Blended Scotch whisky aged 12 years. Rich and warm.',                        isLocal:false, popular:false, category:'spirits' },
      { id:'hennessy-vs',      name:'Hennessy VS',         price:2100, tag:'Cognac',          emoji:'🥃', gradient:'linear-gradient(135deg,#c2410c,#1c1917)', desc:'French cognac. Smooth, warm, prestigious.',                                  isLocal:false, popular:false, category:'spirits' },
    ],
    wines: [
      { id:'malbec-reserve',  name:'Malbec Reserve',   price:850,  tag:'Red Wine',    emoji:'🍷', gradient:'linear-gradient(135deg,#7f1d1d,#0c0a09)', desc:'Argentinian full-bodied red with dark fruit and velvet tannins.',   isLocal:false, popular:false, category:'wines' },
      { id:'sauv-blanc',      name:'Sauvignon Blanc',  price:780,  tag:'White Wine',  emoji:'🍷', gradient:'linear-gradient(135deg,#fef9c3,#a16207)', desc:'New Zealand crisp white — citrus, elderflower, gooseberry.',        isLocal:false, popular:false, category:'wines' },
      { id:'moet-chandon',    name:'Moët & Chandon',   price:3500, tag:'🥂 Champagne',emoji:'🍾', gradient:'linear-gradient(135deg,#fde68a,#92400e)', desc:'French Brut Impérial. Pure celebration in a bottle.',               isLocal:false, popular:true,  category:'wines' },
      { id:'rose-provencal',  name:'Rosé Provençal',   price:950,  tag:'Rosé',        emoji:'🍷', gradient:'linear-gradient(135deg,#fda4af,#9f1239)', desc:'Classic French rosé. Elegant, dry, refreshing.',                   isLocal:false, popular:false, category:'wines' },
      { id:'shiraz-classic',  name:'Shiraz Classic',   price:720,  tag:'Red Wine',    emoji:'🍷', gradient:'linear-gradient(135deg,#a21caf,#1e1b4b)', desc:'Bold Australian Shiraz. Spiced plum with a smoky finish.',          isLocal:false, popular:false, category:'wines' },
      { id:'prosecco-doc',    name:'Prosecco DOC',     price:1100, tag:'Sparkling',   emoji:'🥂', gradient:'linear-gradient(135deg,#fef3c7,#b45309)', desc:'Italian sparkling wine — vibrant bubbles and light fruit.',         isLocal:false, popular:false, category:'wines' },
    ],
    cocktails: [
      { id:'ninja-shadow',   name:'Ninja Shadow',    price:280, tag:'★ Signature',    emoji:'🍹', gradient:'linear-gradient(135deg,#18181b,#dc2626)', desc:'Black vodka, elderflower, fresh lime, activated charcoal. Bold and dark.', isLocal:false, popular:true,  category:'cocktails' },
      { id:'isle-punch',     name:'Isle Punch',      price:250, tag:'🇲🇺 MU Special', emoji:'🍹', gradient:'linear-gradient(135deg,#ea2839,#003f9b)', desc:'Local rum, tropical fruits, island spices. Pure Mauritius in a glass.',    isLocal:true,  popular:true,  category:'cocktails' },
      { id:'dark-striker',   name:'Dark Striker',    price:290, tag:'★ Signature',    emoji:'🍹', gradient:'linear-gradient(135deg,#292524,#c2410c)', desc:'Dark rum, ginger beer, aromatic bitters, orange twist.',                   isLocal:false, popular:false, category:'cocktails' },
      { id:'mango-katana',   name:'Mango Katana',    price:240, tag:'Tropical',       emoji:'🍹', gradient:'linear-gradient(135deg,#f97316,#7c3aed)', desc:'Mango rum, passion fruit, fresh mint, soda water.',                       isLocal:false, popular:false, category:'cocktails' },
      { id:'blue-lagoon-mu', name:'Blue Lagoon MU',  price:260, tag:'🇲🇺 MU Special', emoji:'🍹', gradient:'linear-gradient(135deg,#0ea5e9,#003f9b)', desc:"Vodka, blue curaçao, lemon — inspired by our Indian Ocean.",              isLocal:true,  popular:false, category:'cocktails' },
      { id:'cane-warrior',   name:'Cane Warrior',    price:270, tag:'★ Signature',    emoji:'🍹', gradient:'linear-gradient(135deg,#16a34a,#78350f)', desc:'Mauritian rum, fresh cane sugar, lime, Angostura bitters.',               isLocal:true,  popular:false, category:'cocktails' },
    ],
    softs: [
      { id:'eski-cola',      name:'Eski Cola',         price:45,  tag:'🇲🇺 Local',  emoji:'🥤', gradient:'linear-gradient(135deg,#dc2626,#0c0a09)', desc:"Mauritius' own cola. Refreshing and nostalgic.",                      isLocal:true,  popular:false, category:'softs' },
      { id:'tropical-juice', name:'Tropical Juice Mix',price:65,  tag:'Fresh',      emoji:'🧃', gradient:'linear-gradient(135deg,#fbbf24,#ea580c)', desc:'Mango, passion fruit & guava blend. 100% island flavour.',           isLocal:true,  popular:false, category:'softs' },
      { id:'perrier',        name:'Perrier Sparkling', price:85,  tag:'Premium',    emoji:'💧', gradient:'linear-gradient(135deg,#bae6fd,#0c4a6e)', desc:'French sparkling mineral water — refined fizz.',                     isLocal:false, popular:false, category:'softs' },
      { id:'red-bull',       name:'Red Bull',          price:95,  tag:'Energy',     emoji:'⚡', gradient:'linear-gradient(135deg,#e2e8f0,#1e40af)', desc:'The classic energy drink. Wings guaranteed.',                        isLocal:false, popular:false, category:'softs' },
      { id:'lemon-squash',   name:'Lemon Squash',      price:55,  tag:'Refresh',    emoji:'🍋', gradient:'linear-gradient(135deg,#fef08a,#16a34a)', desc:'Fresh-squeezed lemon with sparkling water.',                         isLocal:false, popular:false, category:'softs' },
      { id:'virgin-mojito',  name:'Virgin Mojito',     price:120, tag:'Mocktail',   emoji:'🌿', gradient:'linear-gradient(135deg,#4ade80,#052e16)', desc:'Fresh mint, lime, cane sugar, sparkling water. Zero alcohol.',       isLocal:false, popular:false, category:'softs' },
    ],
  },
};

/**
 * SECURE DATA ACCESSOR
 * Provides "Advanced" utility methods for the application.
 */
const DataStore = {
  // Classic: Direct access to all data
  getAll: () => DATA,

  // Advanced: Get items by category with safe filtering
  getItemsByCategory: (category) => {
    const safeCategory = String(category).toLowerCase();
    return DATA.items[safeCategory] || [];
  },

  // Secured: Basic input sanitization to prevent XSS/Injection in local files
  sanitizeInput: (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[<>]/g, ''); // Simple classic security filter
  },

  // Advanced: Find item by ID
  getItemById: (id) => {
    for (const cat of DATA.categories) {
      const found = DATA.items[cat].find(item => item.id === id);
      if (found) return found;
    }
    return null;
  },

  // Secured: Sync local changes back to file (if needed for persistence)
  saveData: () => {
    const content = `module.exports = ${JSON.stringify(DATA, null, 2)};`;
    // Note: In production, use atomic writes for safety
    fs.writeFileSync(__filename, content);
  }
};

// Export both the raw data for compatibility and the DataStore methods for security
module.exports = { ...DATA, ...DataStore };
