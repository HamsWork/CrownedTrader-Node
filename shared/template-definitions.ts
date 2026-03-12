export interface TemplateVariable {
  name: string;
  type: string;
  label: string;
}

export interface TemplateField {
  name: string;
  value: string;
}

export interface TemplateDefinition {
  name: string;
  slug: string;
  category: string;
  content: string;
  color: string;
  variables: TemplateVariable[];
  titleTemplate: string;
  descriptionTemplate: string;
  fieldsTemplate: TemplateField[];
  footerTemplate: string;
  showTitleDefault: boolean;
  showDescriptionDefault: boolean;
}

export const CATEGORIES = ["Options", "Shares", "LETF", "LETF Option", "Crypto"] as const;
export type Category = (typeof CATEGORIES)[number];

export const ACTION_TYPES = [
  { name: "Entry Signal", slug: "signal_alert", color: "#22c55e" },
  { name: "Target TP1 Hit", slug: "target_hit", color: "#22c55e" },
  { name: "Target TP2 Hit", slug: "target_hit_tp2", color: "#22c55e" },
  { name: "SL Raised (TP1)", slug: "stop_loss_raised", color: "#f59e0b" },
  { name: "Stop Loss Hit", slug: "stop_loss_hit", color: "#ef4444" },
] as const;

function makeVars(...names: string[]): TemplateVariable[] {
  return names.map(n => ({ name: n, type: "string", label: n.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) }));
}

function makeFields(pairs: [string, string][]): TemplateField[] {
  return pairs.map(([name, value]) => ({ name, value }));
}

const CATEGORY_CONFIGS: Record<Category, {
  entryVars: string[];
  entryFields: [string, string][];
  entryTitle: string;
  entryDesc: string;
  hitVars: string[];
  hitFields: [string, string][];
  hitTitle: string;
  hitDesc: string;
  slRaisedVars: string[];
  slRaisedFields: [string, string][];
  slRaisedTitle: string;
  slRaisedDesc: string;
  slHitVars: string[];
  slHitFields: [string, string][];
  slHitTitle: string;
  slHitDesc: string;
  footer: string;
}> = {
  Options: {
    entryVars: ["ticker", "contract", "strike", "expiration", "direction", "entry_price", "stop_loss"],
    entryFields: [["Ticker", "{{ticker}}"], ["Contract", "{{contract}}"], ["✍️ Strike", "{{strike}}"], ["❌ Expiration", "{{expiration}}"], ["Direction", "{{direction}}"], ["✅ Entry", "${{entry_price}}"], ["🛑 Stop Loss", "${{stop_loss}}"]],
    entryTitle: "🚀 {{ticker}} {{strike}}{{direction}} {{expiration}}",
    entryDesc: "New options alert!\nEntry: ${{entry_price}} | SL: ${{stop_loss}}",
    hitVars: ["ticker", "strike", "expiration", "direction", "entry_price", "exit_price", "profit_pct"],
    hitFields: [["❌ Expiration", "{{expiration}}"], ["✍️ Strike", "{{strike}} {{direction}}"], ["💵 Option Price", "${{exit_price}}"], ["✅ Entry", "${{entry_price}}"], ["🎯 TP Hit", "${{exit_price}}"], ["💸 Profit", "{{profit_pct}}%"]],
    hitTitle: "",
    hitDesc: "**🎯 {{ticker}} Options Take Profit HIT**",
    slRaisedVars: ["ticker", "strike", "expiration", "direction", "entry_price", "new_stop_loss", "risk_value", "option_price"],
    slRaisedFields: [["❌ Expiration", "{{expiration}}"], ["✍️ Strike", "{{strike}} {{direction}}"], ["💵 Option Price", "${{option_price}}"], ["✅ Entry", "${{entry_price}}"], ["🛡️ New Stop", "${{new_stop_loss}}"], ["💸 Risk", "{{risk_value}}"]],
    slRaisedTitle: "",
    slRaisedDesc: "**🛡️ {{ticker}} Options Stop Loss Raised**",
    slHitVars: ["ticker", "strike", "expiration", "direction", "entry_price", "exit_price", "profit_pct"],
    slHitFields: [["❌ Expiration", "{{expiration}}"], ["✍️ Strike", "{{strike}} {{direction}}"], ["💵 Option Price", "${{exit_price}}"], ["✅ Entry", "${{entry_price}}"], ["🛑 Stop Hit", "${{exit_price}}"], ["💸 Result", "{{profit_pct}}%"]],
    slHitTitle: "",
    slHitDesc: "**🛑 {{ticker}} Options Stop Loss HIT**",
    footer: "Disclaimer: Not financial advice. Trade at your own risk.",
  },
  Shares: {
    entryVars: ["ticker", "action", "entry_price", "quantity", "stop_loss", "take_profit"],
    entryFields: [["Ticker", "{{ticker}}"], ["Action", "{{action}}"], ["Entry", "${{entry_price}}"], ["Quantity", "{{quantity}}"], ["Stop Loss", "${{stop_loss}}"], ["Take Profit", "${{take_profit}}"]],
    entryTitle: "🚀 {{action}} {{ticker}} @ ${{entry_price}}",
    entryDesc: "New shares alert!\nQty: {{quantity}} | SL: ${{stop_loss}} | TP: ${{take_profit}}",
    hitVars: ["ticker", "action", "entry_price", "exit_price", "quantity", "profit_pct", "take_profit", "notes", "pnl"],
    hitFields: [["Ticker", "{{ticker}}"], ["Action", "{{action}}"], ["Entry", "${{entry_price}}"], ["Exit", "${{exit_price}}"], ["Quantity", "{{quantity}}"], ["Profit", "{{profit_pct}}%"], ["Take Profit", "${{take_profit}}"], ["P&L", "{{pnl}}"], ["Notes", "{{notes}}"]],
    hitTitle: "🎯 TP Hit — {{ticker}}",
    hitDesc: "Target reached!\nEntry: ${{entry_price}} → Exit: ${{exit_price}} ({{profit_pct}}%)",
    slRaisedVars: ["ticker", "action", "entry_price", "old_stop_loss", "new_stop_loss", "quantity", "take_profit", "notes"],
    slRaisedFields: [["Ticker", "{{ticker}}"], ["Action", "{{action}}"], ["Entry", "${{entry_price}}"], ["Old SL", "${{old_stop_loss}}"], ["New SL", "${{new_stop_loss}}"], ["Quantity", "{{quantity}}"], ["Take Profit", "${{take_profit}}"], ["Notes", "{{notes}}"]],
    slRaisedTitle: "🔄 SL Raised — {{ticker}}",
    slRaisedDesc: "Stop loss moved up after TP1\nOld: ${{old_stop_loss}} → New: ${{new_stop_loss}}",
    slHitVars: ["ticker", "action", "entry_price", "exit_price", "quantity", "loss_pct", "stop_loss", "notes"],
    slHitFields: [["Ticker", "{{ticker}}"], ["Action", "{{action}}"], ["Entry", "${{entry_price}}"], ["Exit", "${{exit_price}}"], ["Quantity", "{{quantity}}"], ["Loss", "{{loss_pct}}%"], ["Stop Loss", "${{stop_loss}}"], ["Notes", "{{notes}}"]],
    slHitTitle: "⚠️ Stop Loss Hit — {{ticker}}",
    slHitDesc: "Stop loss triggered\nEntry: ${{entry_price}} → Exit: ${{exit_price}} ({{loss_pct}}%)",
    footer: "Disclaimer: Not financial advice. Trade at your own risk.",
  },
  LETF: {
    entryVars: ["ticker", "leverage", "direction", "entry_price", "stop_loss", "take_profit"],
    entryFields: [["ETF", "{{ticker}}"], ["Leverage", "{{leverage}}"], ["Direction", "{{direction}}"], ["Entry", "${{entry_price}}"], ["Stop Loss", "${{stop_loss}}"], ["Take Profit", "${{take_profit}}"]],
    entryTitle: "🚀 {{ticker}} ({{leverage}} {{direction}})",
    entryDesc: "New LETF alert!\nEntry: ${{entry_price}} | SL: ${{stop_loss}} | TP: ${{take_profit}}",
    hitVars: ["ticker", "leverage", "direction", "entry_price", "exit_price", "profit_pct", "take_profit", "notes", "pnl"],
    hitFields: [["ETF", "{{ticker}}"], ["Leverage", "{{leverage}}"], ["Direction", "{{direction}}"], ["Entry", "${{entry_price}}"], ["Exit", "${{exit_price}}"], ["Profit", "{{profit_pct}}%"], ["Take Profit", "${{take_profit}}"], ["P&L", "{{pnl}}"], ["Notes", "{{notes}}"]],
    hitTitle: "🎯 TP Hit — {{ticker}} ({{leverage}})",
    hitDesc: "Target reached!\nEntry: ${{entry_price}} → Exit: ${{exit_price}} ({{profit_pct}}%)",
    slRaisedVars: ["ticker", "leverage", "direction", "entry_price", "old_stop_loss", "new_stop_loss", "take_profit", "notes"],
    slRaisedFields: [["ETF", "{{ticker}}"], ["Leverage", "{{leverage}}"], ["Direction", "{{direction}}"], ["Entry", "${{entry_price}}"], ["Old SL", "${{old_stop_loss}}"], ["New SL", "${{new_stop_loss}}"], ["Take Profit", "${{take_profit}}"], ["Notes", "{{notes}}"]],
    slRaisedTitle: "🔄 SL Raised — {{ticker}}",
    slRaisedDesc: "Stop loss moved up after TP1\nOld: ${{old_stop_loss}} → New: ${{new_stop_loss}}",
    slHitVars: ["ticker", "leverage", "direction", "entry_price", "exit_price", "loss_pct", "stop_loss", "notes"],
    slHitFields: [["ETF", "{{ticker}}"], ["Leverage", "{{leverage}}"], ["Direction", "{{direction}}"], ["Entry", "${{entry_price}}"], ["Exit", "${{exit_price}}"], ["Loss", "{{loss_pct}}%"], ["Stop Loss", "${{stop_loss}}"], ["Notes", "{{notes}}"]],
    slHitTitle: "⚠️ Stop Loss Hit — {{ticker}}",
    slHitDesc: "Stop loss triggered\nEntry: ${{entry_price}} → Exit: ${{exit_price}} ({{loss_pct}}%)",
    footer: "Disclaimer: Not financial advice. Trade at your own risk.",
  },
  "LETF Option": {
    entryVars: ["ticker", "contract", "strike", "expiration", "direction", "leverage", "entry_price", "stop_loss"],
    entryFields: [["ETF", "{{ticker}}"], ["Contract", "{{contract}}"], ["Strike", "{{strike}}"], ["Expiration", "{{expiration}}"], ["Direction", "{{direction}}"], ["Leverage", "{{leverage}}"], ["Entry", "${{entry_price}}"], ["Stop Loss", "${{stop_loss}}"]],
    entryTitle: "🚀 {{ticker}} {{strike}}{{direction}} {{expiration}} ({{leverage}})",
    entryDesc: "New LETF options alert!\nEntry: ${{entry_price}} | SL: ${{stop_loss}}",
    hitVars: ["ticker", "contract", "strike", "expiration", "direction", "leverage", "entry_price", "exit_price", "profit_pct"],
    hitFields: [["ETF", "{{ticker}}"], ["Contract", "{{contract}}"], ["Strike", "{{strike}}"], ["Expiration", "{{expiration}}"], ["Direction", "{{direction}}"], ["Leverage", "{{leverage}}"], ["Entry", "${{entry_price}}"], ["Exit", "${{exit_price}}"], ["Profit", "{{profit_pct}}%"]],
    hitTitle: "🎯 TP Hit — {{ticker}} {{strike}}{{direction}} ({{leverage}})",
    hitDesc: "Target reached!\nEntry: ${{entry_price}} → Exit: ${{exit_price}} ({{profit_pct}}%)",
    slRaisedVars: ["ticker", "contract", "strike", "expiration", "direction", "leverage", "old_stop_loss", "new_stop_loss"],
    slRaisedFields: [["ETF", "{{ticker}}"], ["Contract", "{{contract}}"], ["Strike", "{{strike}}"], ["Expiration", "{{expiration}}"], ["Direction", "{{direction}}"], ["Leverage", "{{leverage}}"], ["Old SL", "${{old_stop_loss}}"], ["New SL", "${{new_stop_loss}}"]],
    slRaisedTitle: "🔄 SL Raised — {{ticker}} {{strike}}{{direction}}",
    slRaisedDesc: "Stop loss moved up after TP1\nOld: ${{old_stop_loss}} → New: ${{new_stop_loss}}",
    slHitVars: ["ticker", "contract", "strike", "expiration", "direction", "leverage", "entry_price", "exit_price"],
    slHitFields: [["ETF", "{{ticker}}"], ["Contract", "{{contract}}"], ["Strike", "{{strike}}"], ["Expiration", "{{expiration}}"], ["Direction", "{{direction}}"], ["Leverage", "{{leverage}}"], ["Entry", "${{entry_price}}"], ["Exit", "${{exit_price}}"]],
    slHitTitle: "⚠️ Stop Loss Hit — {{ticker}} {{strike}}{{direction}}",
    slHitDesc: "Stop loss triggered\nEntry: ${{entry_price}} → Exit: ${{exit_price}}",
    footer: "Disclaimer: Not financial advice. Trade at your own risk.",
  },
  Crypto: {
    entryVars: ["coin", "pair", "action", "entry_price", "stop_loss", "take_profit"],
    entryFields: [["Coin", "{{coin}}"], ["Pair", "{{pair}}"], ["Action", "{{action}}"], ["Entry", "${{entry_price}}"], ["Stop Loss", "${{stop_loss}}"], ["Take Profit", "${{take_profit}}"]],
    entryTitle: "🚀 {{action}} {{coin}} ({{pair}})",
    entryDesc: "New crypto alert!\nEntry: ${{entry_price}} | SL: ${{stop_loss}} | TP: ${{take_profit}}",
    hitVars: ["coin", "pair", "action", "entry_price", "exit_price", "profit_pct", "take_profit", "notes", "pnl"],
    hitFields: [["Coin", "{{coin}}"], ["Pair", "{{pair}}"], ["Action", "{{action}}"], ["Entry", "${{entry_price}}"], ["Exit", "${{exit_price}}"], ["Profit", "{{profit_pct}}%"], ["Take Profit", "${{take_profit}}"], ["P&L", "{{pnl}}"], ["Notes", "{{notes}}"]],
    hitTitle: "🎯 TP Hit — {{coin}} ({{pair}})",
    hitDesc: "Target reached!\nEntry: ${{entry_price}} → Exit: ${{exit_price}} ({{profit_pct}}%)",
    slRaisedVars: ["coin", "pair", "action", "entry_price", "old_stop_loss", "new_stop_loss", "take_profit", "notes"],
    slRaisedFields: [["Coin", "{{coin}}"], ["Pair", "{{pair}}"], ["Action", "{{action}}"], ["Entry", "${{entry_price}}"], ["Old SL", "${{old_stop_loss}}"], ["New SL", "${{new_stop_loss}}"], ["Take Profit", "${{take_profit}}"], ["Notes", "{{notes}}"]],
    slRaisedTitle: "🔄 SL Raised — {{coin}}",
    slRaisedDesc: "Stop loss moved up after TP1\nOld: ${{old_stop_loss}} → New: ${{new_stop_loss}}",
    slHitVars: ["coin", "pair", "action", "entry_price", "exit_price", "loss_pct", "stop_loss", "notes"],
    slHitFields: [["Coin", "{{coin}}"], ["Pair", "{{pair}}"], ["Action", "{{action}}"], ["Entry", "${{entry_price}}"], ["Exit", "${{exit_price}}"], ["Loss", "{{loss_pct}}%"], ["Stop Loss", "${{stop_loss}}"], ["Notes", "{{notes}}"]],
    slHitTitle: "⚠️ Stop Loss Hit — {{coin}}",
    slHitDesc: "Stop loss triggered\nEntry: ${{entry_price}} → Exit: ${{exit_price}} ({{loss_pct}}%)",
    footer: "Disclaimer: Not financial advice. Trade at your own risk.",
  },
};

function buildTemplatesForCategory(category: Category): TemplateDefinition[] {
  const cfg = CATEGORY_CONFIGS[category];
  return [
    {
      name: "Entry Signal",
      slug: "signal_alert",
      category,
      content: "@everyone",
      color: "#22c55e",
      variables: makeVars(...cfg.entryVars),
      titleTemplate: cfg.entryTitle,
      descriptionTemplate: cfg.entryDesc,
      fieldsTemplate: makeFields(cfg.entryFields),
      footerTemplate: cfg.footer,
      showTitleDefault: true,
      showDescriptionDefault: true,
    },
    {
      name: "Target TP1 Hit",
      slug: "target_hit",
      category,
      content: "",
      color: "#22c55e",
      variables: makeVars(...cfg.hitVars),
      titleTemplate: cfg.hitTitle,
      descriptionTemplate: cfg.hitDesc,
      fieldsTemplate: makeFields(cfg.hitFields),
      footerTemplate: cfg.footer,
      showTitleDefault: true,
      showDescriptionDefault: true,
    },
    {
      name: "Target TP2 Hit",
      slug: "target_hit_tp2",
      category,
      content: "",
      color: "#22c55e",
      variables: makeVars(...cfg.hitVars),
      titleTemplate: cfg.hitTitle.replace("TP Hit", "TP2 Hit"),
      descriptionTemplate: cfg.hitDesc.replace("Target reached", "Second target reached"),
      fieldsTemplate: makeFields(cfg.hitFields),
      footerTemplate: cfg.footer,
      showTitleDefault: true,
      showDescriptionDefault: true,
    },
    {
      name: "SL Raised (TP1)",
      slug: "stop_loss_raised",
      category,
      content: "",
      color: "#f59e0b",
      variables: makeVars(...cfg.slRaisedVars),
      titleTemplate: cfg.slRaisedTitle,
      descriptionTemplate: cfg.slRaisedDesc,
      fieldsTemplate: makeFields(cfg.slRaisedFields),
      footerTemplate: cfg.footer,
      showTitleDefault: true,
      showDescriptionDefault: true,
    },
    {
      name: "Stop Loss Hit",
      slug: "stop_loss_hit",
      category,
      content: "",
      color: "#ef4444",
      variables: makeVars(...cfg.slHitVars),
      titleTemplate: cfg.slHitTitle,
      descriptionTemplate: cfg.slHitDesc,
      fieldsTemplate: makeFields(cfg.slHitFields),
      footerTemplate: cfg.footer,
      showTitleDefault: true,
      showDescriptionDefault: true,
    },
  ];
}

export const DEFAULT_TEMPLATES: TemplateDefinition[] = CATEGORIES.flatMap(buildTemplatesForCategory);

export const SAMPLE_TICKERS: Record<Category, string> = {
  Options: "AAPL",
  Shares: "AAPL",
  LETF: "TQQQ",
  "LETF Option": "SOXL",
  Crypto: "BTC",
};
