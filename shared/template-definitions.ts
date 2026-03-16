export interface TemplateVariable {
  name: string;
  type: string;
  label: string;
}

export interface TemplateField {
  name: string;
  value: string;
  inline?: boolean;
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

const SPACER: TemplateField = { name: "\u200b", value: "", inline: false };
const DISCLAIMER = "Disclaimer: Not financial advice. Trade at your own risk.";

const CATEGORY_CONFIGS: Record<Category, {
  entryVars: string[];
  entryFields: TemplateField[];
  entryDesc: string;
  hitVars: string[];
  hitFields: TemplateField[];
  hitDesc: string;
  slRaisedVars: string[];
  slRaisedFields: TemplateField[];
  slRaisedDesc: string;
  slHitVars: string[];
  slHitFields: TemplateField[];
  slHitDesc: string;
}> = {
  Options: {
    entryVars: ["ticker", "stock_price", "expiration", "strike", "direction", "option_price", "stop_loss", "time_stop", "trade_plan", "take_profit_plan", "app_name"],
    entryFields: [
      { ...SPACER },
      { name: "🟢 Ticker", value: "{{ticker}}", inline: true },
      { name: "📊 Stock Price", value: "{{stock_price}}", inline: true },
      { ...SPACER },
      { name: "❌ Expiration", value: "{{expiration}}", inline: true },
      { name: "✍️ Strike", value: "{{strike}} {{direction}}", inline: true },
      { name: "💵 Option Price", value: "{{option_price}}", inline: true },
      { ...SPACER },
      { name: "📝 Trade Plan", value: "{{trade_plan}}", inline: false },
      { ...SPACER },
      { name: "💰 Take Profit Plan", value: "{{take_profit_plan}}", inline: false },
    ],
    entryDesc: "**🚨 {{ticker}} Options Entry - {{app_name}}**",
    hitVars: ["ticker", "expiration", "strike", "direction", "option_price", "entry_price", "tp_price", "profit_pct", "tp_number", "take_off_pct", "position_mgmt", "risk_mgmt", "new_stop_loss"],
    hitFields: [
      { ...SPACER },
      { name: "❌ Expiration", value: "{{expiration}}", inline: true },
      { name: "✍️ Strike", value: "{{strike}} {{direction}}", inline: true },
      { name: "💵 Option Price", value: "{{tp_price}}", inline: true },
      { ...SPACER },
      { name: "✅ Entry", value: "{{entry_price}}", inline: true },
      { name: "🎯 TP{{tp_number}} Hit", value: "{{tp_price}}", inline: true },
      { name: "💸 Profit", value: "{{profit_pct}}", inline: true },
      { ...SPACER },
      { name: "🔍 Position Management", value: "{{position_mgmt}}", inline: false },
      { ...SPACER },
      { name: "🛡️ Risk Management", value: "{{risk_mgmt}}", inline: false },
    ],
    hitDesc: "**🎯 {{ticker}} Options Take Profit HIT**",
    slRaisedVars: ["ticker", "expiration", "strike", "direction", "option_price", "entry_price", "new_stop_loss", "risk_value", "risk_mgmt"],
    slRaisedFields: [
      { ...SPACER },
      { name: "❌ Expiration", value: "{{expiration}}", inline: true },
      { name: "✍️ Strike", value: "{{strike}} {{direction}}", inline: true },
      { name: "💵 Option Price", value: "{{option_price}}", inline: true },
      { ...SPACER },
      { name: "✅ Entry", value: "{{entry_price}}", inline: true },
      { name: "🛡️ New Stop", value: "{{new_stop_loss}}", inline: true },
      { name: "💸 Risk", value: "{{risk_value}}", inline: true },
      { ...SPACER },
      { name: "🛡️ Risk Management", value: "{{risk_mgmt}}", inline: false },
    ],
    slRaisedDesc: "**🛡️ {{ticker}} Options Stop Loss Raised**",
    slHitVars: ["ticker", "expiration", "strike", "direction", "option_price", "entry_price", "exit_price", "profit_pct"],
    slHitFields: [
      { ...SPACER },
      { name: "❌ Expiration", value: "{{expiration}}", inline: true },
      { name: "✍️ Strike", value: "{{strike}} {{direction}}", inline: true },
      { name: "💵 Option Price", value: "{{exit_price}}", inline: true },
      { ...SPACER },
      { name: "✅ Entry", value: "{{entry_price}}", inline: true },
      { name: "🛑 Stop Hit", value: "{{exit_price}}", inline: true },
      { name: "💸 Result", value: "{{profit_pct}}", inline: true },
    ],
    slHitDesc: "**🛑 {{ticker}} Options Stop Loss HIT**",
  },
  Shares: {
    entryVars: ["ticker", "stock_price", "direction", "stop_loss", "time_stop", "trade_plan", "take_profit_plan", "app_name"],
    entryFields: [
      { ...SPACER },
      { name: "🟢 Ticker", value: "{{ticker}}", inline: true },
      { name: "📊 Stock Price", value: "{{stock_price}}", inline: true },
      { name: "📈 Direction", value: "{{direction}}", inline: true },
      { ...SPACER },
      { name: "📝 Trade Plan", value: "{{trade_plan}}", inline: false },
      { ...SPACER },
      { name: "💰 Take Profit Plan", value: "{{take_profit_plan}}", inline: false },
    ],
    entryDesc: "**🚨 {{ticker}} Shares Entry - {{app_name}}**",
    hitVars: ["ticker", "direction", "stock_price", "entry_price", "tp_price", "profit_pct", "tp_number", "take_off_pct", "position_mgmt", "risk_mgmt", "new_stop_loss"],
    hitFields: [
      { ...SPACER },
      { name: "🟢 Ticker", value: "{{ticker}}", inline: true },
      { name: "📊 Stock Price", value: "{{stock_price}}", inline: true },
      { name: "📈 Direction", value: "{{direction}}", inline: true },
      { ...SPACER },
      { name: "✅ Entry", value: "{{entry_price}}", inline: true },
      { name: "🎯 TP{{tp_number}} Hit", value: "{{tp_price}}", inline: true },
      { name: "💸 Profit", value: "{{profit_pct}}", inline: true },
      { ...SPACER },
      { name: "🔍 Position Management", value: "{{position_mgmt}}", inline: false },
      { ...SPACER },
      { name: "🛡️ Risk Management", value: "{{risk_mgmt}}", inline: false },
    ],
    hitDesc: "**🎯 {{ticker}} Shares Take Profit HIT**",
    slRaisedVars: ["ticker", "direction", "stock_price", "entry_price", "new_stop_loss", "risk_value", "risk_mgmt"],
    slRaisedFields: [
      { ...SPACER },
      { name: "🟢 Ticker", value: "{{ticker}}", inline: true },
      { name: "📊 Stock Price", value: "{{stock_price}}", inline: true },
      { name: "📈 Direction", value: "{{direction}}", inline: true },
      { ...SPACER },
      { name: "✅ Entry", value: "{{entry_price}}", inline: true },
      { name: "🛡️ New Stop", value: "{{new_stop_loss}}", inline: true },
      { name: "💸 Risk", value: "{{risk_value}}", inline: true },
      { ...SPACER },
      { name: "🛡️ Risk Management", value: "{{risk_mgmt}}", inline: false },
    ],
    slRaisedDesc: "**🛡️ {{ticker}} Shares Stop Loss Raised**",
    slHitVars: ["ticker", "direction", "stock_price", "entry_price", "exit_price", "profit_pct"],
    slHitFields: [
      { ...SPACER },
      { name: "🟢 Ticker", value: "{{ticker}}", inline: true },
      { name: "📊 Stock Price", value: "{{stock_price}}", inline: true },
      { name: "📈 Direction", value: "{{direction}}", inline: true },
      { ...SPACER },
      { name: "✅ Entry", value: "{{entry_price}}", inline: true },
      { name: "🛑 Stop Hit", value: "{{exit_price}}", inline: true },
      { name: "💸 Result", value: "{{profit_pct}}", inline: true },
    ],
    slHitDesc: "**🛑 {{ticker}} Shares Stop Loss HIT**",
  },
  LETF: {
    entryVars: ["ticker", "underlying", "direction", "leverage", "letf_ticker", "letf_direction", "letf_entry", "stop_loss", "time_stop", "trade_plan", "take_profit_plan", "app_name"],
    entryFields: [
      { ...SPACER },
      { name: "🟢 Ticker", value: "{{underlying}}", inline: true },
      { name: "📈 Direction", value: "{{direction}}", inline: true },
      { ...SPACER },
      { name: "📹 LETF", value: "{{letf_ticker}} ({{leverage}}x {{letf_direction}})", inline: true },
      { name: "💰 LETF Entry", value: "{{letf_entry}}", inline: true },
      { ...SPACER },
      { name: "📝 Trade Plan", value: "{{trade_plan}}", inline: false },
      { ...SPACER },
      { name: "💰 Take Profit Plan", value: "{{take_profit_plan}}", inline: false },
    ],
    entryDesc: "**🚨 {{underlying}} Shares Entry - {{app_name}}**",
    hitVars: ["ticker", "underlying", "direction", "leverage", "letf_ticker", "letf_direction", "entry_price", "tp_price", "profit_pct", "tp_number", "take_off_pct", "position_mgmt", "risk_mgmt", "new_stop_loss"],
    hitFields: [
      { ...SPACER },
      { name: "🟢 Ticker", value: "{{underlying}}", inline: true },
      { name: "📈 Direction", value: "{{direction}}", inline: true },
      { ...SPACER },
      { name: "✅ Entry", value: "{{entry_price}}", inline: true },
      { name: "🎯 TP{{tp_number}} Hit", value: "{{tp_price}}", inline: true },
      { name: "💸 Profit", value: "{{profit_pct}}", inline: true },
      { ...SPACER },
      { name: "🔍 Position Management", value: "{{position_mgmt}}", inline: false },
      { ...SPACER },
      { name: "🛡️ Risk Management", value: "{{risk_mgmt}}", inline: false },
    ],
    hitDesc: "**🎯 {{underlying}} Shares Take Profit HIT**",
    slRaisedVars: ["ticker", "underlying", "direction", "leverage", "letf_ticker", "letf_direction", "entry_price", "new_stop_loss", "risk_value", "risk_mgmt"],
    slRaisedFields: [
      { ...SPACER },
      { name: "🟢 Ticker", value: "{{underlying}}", inline: true },
      { name: "📈 Direction", value: "{{direction}}", inline: true },
      { ...SPACER },
      { name: "✅ Entry", value: "{{entry_price}}", inline: true },
      { name: "🛡️ New Stop", value: "{{new_stop_loss}}", inline: true },
      { name: "💸 Risk", value: "{{risk_value}}", inline: true },
      { ...SPACER },
      { name: "🛡️ Risk Management", value: "{{risk_mgmt}}", inline: false },
    ],
    slRaisedDesc: "**🛡️ {{underlying}} LETF Stop Loss Raised**",
    slHitVars: ["ticker", "underlying", "direction", "leverage", "letf_ticker", "letf_direction", "entry_price", "exit_price", "profit_pct"],
    slHitFields: [
      { ...SPACER },
      { name: "🟢 Ticker", value: "{{underlying}}", inline: true },
      { name: "📈 Direction", value: "{{direction}}", inline: true },
      { ...SPACER },
      { name: "✅ Entry", value: "{{entry_price}}", inline: true },
      { name: "🛑 Stop Hit", value: "{{exit_price}}", inline: true },
      { name: "💸 Result", value: "{{profit_pct}}", inline: true },
    ],
    slHitDesc: "**🛑 {{underlying}} LETF Stop Loss HIT**",
  },
  "LETF Option": {
    entryVars: ["ticker", "underlying", "stock_price", "leverage", "letf_ticker", "letf_direction", "expiration", "strike", "direction", "option_price", "stop_loss", "time_stop", "trade_plan", "take_profit_plan", "app_name"],
    entryFields: [
      { ...SPACER },
      { name: "🟢 Ticker", value: "{{underlying}}", inline: true },
      { name: "📊 LETF Price", value: "{{stock_price}}", inline: true },
      { name: "💹 Leveraged ETF", value: "{{letf_ticker}} ({{leverage}}x {{letf_direction}})", inline: true },
      { ...SPACER },
      { name: "❌ Expiration", value: "{{expiration}}", inline: true },
      { name: "✍️ Strike", value: "{{strike}} {{direction}}", inline: true },
      { name: "💵 Option Price", value: "{{option_price}}", inline: true },
      { ...SPACER },
      { name: "📝 Trade Plan", value: "{{trade_plan}}", inline: false },
      { ...SPACER },
      { name: "💰 Take Profit Plan", value: "{{take_profit_plan}}", inline: false },
    ],
    entryDesc: "**🚨 {{underlying}} Options Entry - {{app_name}}**",
    hitVars: ["ticker", "underlying", "leverage", "letf_ticker", "letf_direction", "expiration", "strike", "direction", "option_price", "entry_price", "tp_price", "profit_pct", "tp_number", "take_off_pct", "position_mgmt", "risk_mgmt", "new_stop_loss"],
    hitFields: [
      { ...SPACER },
      { name: "❌ Expiration", value: "{{expiration}}", inline: true },
      { name: "✍️ Strike", value: "{{strike}} {{direction}}", inline: true },
      { name: "💵 Option Price", value: "{{tp_price}}", inline: true },
      { ...SPACER },
      { name: "✅ Entry", value: "{{entry_price}}", inline: true },
      { name: "🎯 TP{{tp_number}} Hit", value: "{{tp_price}}", inline: true },
      { name: "💸 Profit", value: "{{profit_pct}}", inline: true },
      { ...SPACER },
      { name: "🔍 Position Management", value: "{{position_mgmt}}", inline: false },
      { ...SPACER },
      { name: "🛡️ Risk Management", value: "{{risk_mgmt}}", inline: false },
    ],
    hitDesc: "**🎯 {{underlying}} LETF Options Take Profit HIT**",
    slRaisedVars: ["ticker", "underlying", "leverage", "letf_ticker", "letf_direction", "expiration", "strike", "direction", "option_price", "entry_price", "new_stop_loss", "risk_value", "risk_mgmt"],
    slRaisedFields: [
      { ...SPACER },
      { name: "❌ Expiration", value: "{{expiration}}", inline: true },
      { name: "✍️ Strike", value: "{{strike}} {{direction}}", inline: true },
      { name: "💵 Option Price", value: "{{option_price}}", inline: true },
      { ...SPACER },
      { name: "✅ Entry", value: "{{entry_price}}", inline: true },
      { name: "🛡️ New Stop", value: "{{new_stop_loss}}", inline: true },
      { name: "💸 Risk", value: "{{risk_value}}", inline: true },
      { ...SPACER },
      { name: "🛡️ Risk Management", value: "{{risk_mgmt}}", inline: false },
    ],
    slRaisedDesc: "**🛡️ {{underlying}} LETF Options Stop Loss Raised**",
    slHitVars: ["ticker", "underlying", "leverage", "letf_ticker", "letf_direction", "expiration", "strike", "direction", "option_price", "entry_price", "exit_price", "profit_pct"],
    slHitFields: [
      { ...SPACER },
      { name: "❌ Expiration", value: "{{expiration}}", inline: true },
      { name: "✍️ Strike", value: "{{strike}} {{direction}}", inline: true },
      { name: "💵 Option Price", value: "{{exit_price}}", inline: true },
      { ...SPACER },
      { name: "✅ Entry", value: "{{entry_price}}", inline: true },
      { name: "🛑 Stop Hit", value: "{{exit_price}}", inline: true },
      { name: "💸 Result", value: "{{profit_pct}}", inline: true },
    ],
    slHitDesc: "**🛑 {{underlying}} LETF Options Stop Loss HIT**",
  },
  Crypto: {
    entryVars: ["coin", "pair", "direction", "entry_price", "stop_loss", "time_stop", "trade_plan", "take_profit_plan", "app_name"],
    entryFields: [
      { ...SPACER },
      { name: "🟢 Coin", value: "{{coin}}", inline: true },
      { name: "💱 Pair", value: "{{pair}}", inline: true },
      { name: "📈 Direction", value: "{{direction}}", inline: true },
      { ...SPACER },
      { name: "📝 Trade Plan", value: "{{trade_plan}}", inline: false },
      { ...SPACER },
      { name: "💰 Take Profit Plan", value: "{{take_profit_plan}}", inline: false },
    ],
    entryDesc: "**🚨 {{coin}} Crypto Entry - {{app_name}}**",
    hitVars: ["coin", "pair", "direction", "entry_price", "tp_price", "profit_pct", "tp_number", "take_off_pct", "position_mgmt", "risk_mgmt", "new_stop_loss"],
    hitFields: [
      { ...SPACER },
      { name: "🟢 Coin", value: "{{coin}}", inline: true },
      { name: "💱 Pair", value: "{{pair}}", inline: true },
      { name: "📈 Direction", value: "{{direction}}", inline: true },
      { ...SPACER },
      { name: "✅ Entry", value: "{{entry_price}}", inline: true },
      { name: "🎯 TP{{tp_number}} Hit", value: "{{tp_price}}", inline: true },
      { name: "💸 Profit", value: "{{profit_pct}}", inline: true },
      { ...SPACER },
      { name: "🔍 Position Management", value: "{{position_mgmt}}", inline: false },
      { ...SPACER },
      { name: "🛡️ Risk Management", value: "{{risk_mgmt}}", inline: false },
    ],
    hitDesc: "**🎯 {{coin}} Crypto Take Profit HIT**",
    slRaisedVars: ["coin", "pair", "direction", "entry_price", "new_stop_loss", "risk_value", "risk_mgmt"],
    slRaisedFields: [
      { ...SPACER },
      { name: "🟢 Coin", value: "{{coin}}", inline: true },
      { name: "💱 Pair", value: "{{pair}}", inline: true },
      { name: "📈 Direction", value: "{{direction}}", inline: true },
      { ...SPACER },
      { name: "✅ Entry", value: "{{entry_price}}", inline: true },
      { name: "🛡️ New Stop", value: "{{new_stop_loss}}", inline: true },
      { name: "💸 Risk", value: "{{risk_value}}", inline: true },
      { ...SPACER },
      { name: "🛡️ Risk Management", value: "{{risk_mgmt}}", inline: false },
    ],
    slRaisedDesc: "**🛡️ {{coin}} Crypto Stop Loss Raised**",
    slHitVars: ["coin", "pair", "direction", "entry_price", "exit_price", "profit_pct"],
    slHitFields: [
      { ...SPACER },
      { name: "🟢 Coin", value: "{{coin}}", inline: true },
      { name: "💱 Pair", value: "{{pair}}", inline: true },
      { name: "📈 Direction", value: "{{direction}}", inline: true },
      { ...SPACER },
      { name: "✅ Entry", value: "{{entry_price}}", inline: true },
      { name: "🛑 Stop Hit", value: "{{exit_price}}", inline: true },
      { name: "💸 Result", value: "{{profit_pct}}", inline: true },
    ],
    slHitDesc: "**🛑 {{coin}} Crypto Stop Loss HIT**",
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
      titleTemplate: "",
      descriptionTemplate: cfg.entryDesc,
      fieldsTemplate: cfg.entryFields,
      footerTemplate: DISCLAIMER,
      showTitleDefault: false,
      showDescriptionDefault: true,
    },
    {
      name: "Target TP1 Hit",
      slug: "target_hit",
      category,
      content: "",
      color: "#22c55e",
      variables: makeVars(...cfg.hitVars),
      titleTemplate: "",
      descriptionTemplate: cfg.hitDesc,
      fieldsTemplate: cfg.hitFields,
      footerTemplate: DISCLAIMER,
      showTitleDefault: false,
      showDescriptionDefault: true,
    },
    {
      name: "Target TP2 Hit",
      slug: "target_hit_tp2",
      category,
      content: "",
      color: "#22c55e",
      variables: makeVars(...cfg.hitVars),
      titleTemplate: "",
      descriptionTemplate: cfg.hitDesc.replace("Take Profit HIT", "Take Profit 2 HIT"),
      fieldsTemplate: cfg.hitFields,
      footerTemplate: DISCLAIMER,
      showTitleDefault: false,
      showDescriptionDefault: true,
    },
    {
      name: "SL Raised (TP1)",
      slug: "stop_loss_raised",
      category,
      content: "",
      color: "#f59e0b",
      variables: makeVars(...cfg.slRaisedVars),
      titleTemplate: "",
      descriptionTemplate: cfg.slRaisedDesc,
      fieldsTemplate: cfg.slRaisedFields,
      footerTemplate: DISCLAIMER,
      showTitleDefault: false,
      showDescriptionDefault: true,
    },
    {
      name: "Stop Loss Hit",
      slug: "stop_loss_hit",
      category,
      content: "",
      color: "#ef4444",
      variables: makeVars(...cfg.slHitVars),
      titleTemplate: "",
      descriptionTemplate: cfg.slHitDesc,
      fieldsTemplate: cfg.slHitFields,
      footerTemplate: DISCLAIMER,
      showTitleDefault: false,
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
