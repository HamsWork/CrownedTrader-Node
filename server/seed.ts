import { db } from "./db";
import { signalTypes, signals } from "@shared/schema";

export async function seedDatabase() {
  const existingTypes = await db.select().from(signalTypes);
  if (existingTypes.length > 0) return;

  const inserted = await db.insert(signalTypes).values([
    {
      name: "Entry",
      color: "#22C55E",
      variables: [
        { name: "ticker", type: "string", label: "Ticker" },
        { name: "strike", type: "string", label: "Strike Price" },
        { name: "expiration", type: "string", label: "Expiration" },
        { name: "contract", type: "string", label: "Contract" },
        { name: "entry_price", type: "string", label: "Entry Price" },
        { name: "stop_loss", type: "string", label: "Stop Loss" },
        { name: "take_profit", type: "string", label: "Take Profit" },
      ],
      titleTemplate: "{{ticker}} Entry Alert",
      descriptionTemplate: "New entry signal for {{ticker}} at {{entry_price}}",
      fieldsTemplate: [
        { name: "Ticker", value: "{{ticker}}" },
        { name: "Contract", value: "{{contract}}" },
        { name: "Strike", value: "{{strike}}" },
        { name: "Expiration", value: "{{expiration}}" },
        { name: "Entry Price", value: "{{entry_price}}" },
        { name: "Stop Loss", value: "{{stop_loss}}" },
        { name: "Take Profit", value: "{{take_profit}}" },
      ],
      footerTemplate: "Crowned Trader Signals",
      showTitleDefault: true,
      showDescriptionDefault: true,
    },
    {
      name: "Take Profit",
      color: "#3B82F6",
      variables: [
        { name: "ticker", type: "string", label: "Ticker" },
        { name: "contract", type: "string", label: "Contract" },
        { name: "exit_price", type: "string", label: "Exit Price" },
        { name: "profit_pct", type: "string", label: "Profit %" },
      ],
      titleTemplate: "{{ticker}} Take Profit Hit",
      descriptionTemplate: "Take profit reached for {{ticker}} at {{exit_price}} (+{{profit_pct}}%)",
      fieldsTemplate: [
        { name: "Ticker", value: "{{ticker}}" },
        { name: "Contract", value: "{{contract}}" },
        { name: "Exit Price", value: "{{exit_price}}" },
        { name: "Profit", value: "{{profit_pct}}%" },
      ],
      footerTemplate: "Crowned Trader Signals",
      showTitleDefault: true,
      showDescriptionDefault: true,
    },
    {
      name: "Stop Loss",
      color: "#EF4444",
      variables: [
        { name: "ticker", type: "string", label: "Ticker" },
        { name: "contract", type: "string", label: "Contract" },
        { name: "exit_price", type: "string", label: "Exit Price" },
        { name: "loss_pct", type: "string", label: "Loss %" },
      ],
      titleTemplate: "{{ticker}} Stop Loss Hit",
      descriptionTemplate: "Stop loss triggered for {{ticker}} at {{exit_price}} (-{{loss_pct}}%)",
      fieldsTemplate: [
        { name: "Ticker", value: "{{ticker}}" },
        { name: "Contract", value: "{{contract}}" },
        { name: "Exit Price", value: "{{exit_price}}" },
        { name: "Loss", value: "-{{loss_pct}}%" },
      ],
      footerTemplate: "Crowned Trader Signals",
      showTitleDefault: true,
      showDescriptionDefault: true,
    },
    {
      name: "Update",
      color: "#F59E0B",
      variables: [
        { name: "ticker", type: "string", label: "Ticker" },
        { name: "message", type: "string", label: "Message" },
      ],
      titleTemplate: "{{ticker}} Update",
      descriptionTemplate: "{{message}}",
      fieldsTemplate: [
        { name: "Ticker", value: "{{ticker}}" },
      ],
      footerTemplate: "Crowned Trader Signals",
      showTitleDefault: true,
      showDescriptionDefault: true,
    },
  ]).returning();

  const entryType = inserted.find(t => t.name === "Entry");
  const tpType = inserted.find(t => t.name === "Take Profit");
  const slType = inserted.find(t => t.name === "Stop Loss");
  const updateType = inserted.find(t => t.name === "Update");

  if (entryType && tpType && slType && updateType) {
    await db.insert(signals).values([
      {
        signalTypeId: entryType.id,
        data: {
          ticker: "SPY",
          strike: "580",
          expiration: "03/14/2026",
          contract: "SPY 03/14 580C",
          entry_price: "4.50",
          stop_loss: "3.00",
          take_profit: "7.00",
        },
      },
      {
        signalTypeId: entryType.id,
        data: {
          ticker: "NVDA",
          strike: "950",
          expiration: "03/21/2026",
          contract: "NVDA 03/21 950C",
          entry_price: "12.30",
          stop_loss: "8.00",
          take_profit: "20.00",
        },
      },
      {
        signalTypeId: tpType.id,
        data: {
          ticker: "AAPL",
          contract: "AAPL 03/07 245C",
          exit_price: "8.50",
          profit_pct: "42",
        },
      },
      {
        signalTypeId: slType.id,
        data: {
          ticker: "TSLA",
          contract: "TSLA 03/07 280P",
          exit_price: "2.10",
          loss_pct: "30",
        },
      },
      {
        signalTypeId: updateType.id,
        data: {
          ticker: "META",
          message: "Watching for breakout above 620 resistance level. Will alert on entry.",
        },
      },
    ]);
  }

  console.log("Seeded signal types and sample signals");
}
