import { db } from "./db";
import { signalTypes, signals, users } from "@shared/schema";
import { hashPassword } from "./auth";

export async function seedDatabase() {
  const existingUsers = await db.select().from(users);
  if (existingUsers.length === 0) {
    const adminPassword = await hashPassword("admin123");
    await db.insert(users).values({
      username: "admin",
      password: adminPassword,
      role: "admin",
    });

    const userPassword = await hashPassword("user123");
    await db.insert(users).values({
      username: "trader1",
      password: userPassword,
      role: "user",
    });

    console.log("Seeded users (admin/admin123, trader1/user123)");
  }

  const existingTypes = await db.select().from(signalTypes);
  if (existingTypes.length > 0) return;

  await db.insert(signalTypes).values([
    {
      name: "Options",
      color: "#22C55E",
      variables: [
        { name: "ticker", type: "string", label: "Ticker" },
        { name: "contract", type: "string", label: "Contract" },
        { name: "strike", type: "string", label: "Strike Price" },
        { name: "expiration", type: "string", label: "Expiration" },
        { name: "direction", type: "string", label: "Direction (Call/Put)" },
        { name: "entry_price", type: "string", label: "Entry Price" },
        { name: "stop_loss", type: "string", label: "Stop Loss" },
        { name: "take_profit", type: "string", label: "Take Profit" },
        { name: "notes", type: "string", label: "Notes" },
      ],
      titleTemplate: "{{ticker}} {{strike}}{{direction}} {{expiration}}",
      descriptionTemplate: "Entry: ${{entry_price}} | SL: ${{stop_loss}} | TP: ${{take_profit}}\n{{notes}}",
      fieldsTemplate: [
        { name: "Ticker", value: "{{ticker}}" },
        { name: "Contract", value: "{{contract}}" },
        { name: "Strike", value: "{{strike}}" },
        { name: "Expiration", value: "{{expiration}}" },
        { name: "Direction", value: "{{direction}}" },
        { name: "Entry", value: "${{entry_price}}" },
        { name: "Stop Loss", value: "${{stop_loss}}" },
        { name: "Take Profit", value: "${{take_profit}}" },
      ],
      footerTemplate: "Crowned Trader | Options",
      showTitleDefault: true,
      showDescriptionDefault: true,
    },
    {
      name: "Shares",
      color: "#3B82F6",
      variables: [
        { name: "ticker", type: "string", label: "Ticker" },
        { name: "action", type: "string", label: "Action (Buy/Sell)" },
        { name: "entry_price", type: "string", label: "Entry Price" },
        { name: "quantity", type: "string", label: "Quantity" },
        { name: "stop_loss", type: "string", label: "Stop Loss" },
        { name: "take_profit", type: "string", label: "Take Profit" },
        { name: "notes", type: "string", label: "Notes" },
      ],
      titleTemplate: "{{action}} {{ticker}} @ ${{entry_price}}",
      descriptionTemplate: "Qty: {{quantity}} | SL: ${{stop_loss}} | TP: ${{take_profit}}\n{{notes}}",
      fieldsTemplate: [
        { name: "Ticker", value: "{{ticker}}" },
        { name: "Action", value: "{{action}}" },
        { name: "Entry Price", value: "${{entry_price}}" },
        { name: "Quantity", value: "{{quantity}}" },
        { name: "Stop Loss", value: "${{stop_loss}}" },
        { name: "Take Profit", value: "${{take_profit}}" },
      ],
      footerTemplate: "Crowned Trader | Shares",
      showTitleDefault: true,
      showDescriptionDefault: true,
    },
    {
      name: "LETF",
      color: "#F59E0B",
      variables: [
        { name: "ticker", type: "string", label: "ETF Ticker" },
        { name: "leverage", type: "string", label: "Leverage (2x/3x)" },
        { name: "direction", type: "string", label: "Direction (Bull/Bear)" },
        { name: "entry_price", type: "string", label: "Entry Price" },
        { name: "stop_loss", type: "string", label: "Stop Loss" },
        { name: "take_profit", type: "string", label: "Take Profit" },
        { name: "notes", type: "string", label: "Notes" },
      ],
      titleTemplate: "{{ticker}} ({{leverage}} {{direction}})",
      descriptionTemplate: "Entry: ${{entry_price}} | SL: ${{stop_loss}} | TP: ${{take_profit}}\n{{notes}}",
      fieldsTemplate: [
        { name: "ETF", value: "{{ticker}}" },
        { name: "Leverage", value: "{{leverage}}" },
        { name: "Direction", value: "{{direction}}" },
        { name: "Entry", value: "${{entry_price}}" },
        { name: "Stop Loss", value: "${{stop_loss}}" },
        { name: "Take Profit", value: "${{take_profit}}" },
      ],
      footerTemplate: "Crowned Trader | LETF",
      showTitleDefault: true,
      showDescriptionDefault: true,
    },
    {
      name: "LETF Options",
      color: "#8B5CF6",
      variables: [
        { name: "ticker", type: "string", label: "ETF Ticker" },
        { name: "contract", type: "string", label: "Contract" },
        { name: "strike", type: "string", label: "Strike Price" },
        { name: "expiration", type: "string", label: "Expiration" },
        { name: "direction", type: "string", label: "Direction (Call/Put)" },
        { name: "leverage", type: "string", label: "Leverage (2x/3x)" },
        { name: "entry_price", type: "string", label: "Entry Price" },
        { name: "stop_loss", type: "string", label: "Stop Loss" },
        { name: "take_profit", type: "string", label: "Take Profit" },
        { name: "notes", type: "string", label: "Notes" },
      ],
      titleTemplate: "{{ticker}} {{strike}}{{direction}} {{expiration}} ({{leverage}})",
      descriptionTemplate: "Entry: ${{entry_price}} | SL: ${{stop_loss}} | TP: ${{take_profit}}\n{{notes}}",
      fieldsTemplate: [
        { name: "ETF", value: "{{ticker}}" },
        { name: "Contract", value: "{{contract}}" },
        { name: "Strike", value: "{{strike}}" },
        { name: "Expiration", value: "{{expiration}}" },
        { name: "Direction", value: "{{direction}}" },
        { name: "Leverage", value: "{{leverage}}" },
        { name: "Entry", value: "${{entry_price}}" },
        { name: "Stop Loss", value: "${{stop_loss}}" },
        { name: "Take Profit", value: "${{take_profit}}" },
      ],
      footerTemplate: "Crowned Trader | LETF Options",
      showTitleDefault: true,
      showDescriptionDefault: true,
    },
    {
      name: "Crypto",
      color: "#EF4444",
      variables: [
        { name: "coin", type: "string", label: "Coin/Token" },
        { name: "pair", type: "string", label: "Trading Pair" },
        { name: "action", type: "string", label: "Action (Long/Short)" },
        { name: "entry_price", type: "string", label: "Entry Price" },
        { name: "stop_loss", type: "string", label: "Stop Loss" },
        { name: "take_profit", type: "string", label: "Take Profit" },
        { name: "leverage", type: "string", label: "Leverage" },
        { name: "notes", type: "string", label: "Notes" },
      ],
      titleTemplate: "{{action}} {{coin}} ({{pair}})",
      descriptionTemplate: "Entry: ${{entry_price}} | SL: ${{stop_loss}} | TP: ${{take_profit}} | Leverage: {{leverage}}\n{{notes}}",
      fieldsTemplate: [
        { name: "Coin", value: "{{coin}}" },
        { name: "Pair", value: "{{pair}}" },
        { name: "Action", value: "{{action}}" },
        { name: "Entry", value: "${{entry_price}}" },
        { name: "Stop Loss", value: "${{stop_loss}}" },
        { name: "Take Profit", value: "${{take_profit}}" },
        { name: "Leverage", value: "{{leverage}}" },
      ],
      footerTemplate: "Crowned Trader | Crypto",
      showTitleDefault: true,
      showDescriptionDefault: true,
    },
  ]);

  console.log("Seeded discord templates: Options, Shares, LETF, LETF Options, Crypto");
}
