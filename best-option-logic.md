Find the best option contract by increasing DTE until one matches criteria:

Delta between 0.35 and 0.60
Open interest >= 500
Spread < $0.10
Closest to 0.50 delta
CALL for BUY signals, PUT for SELL signals
Swing
Select Strike Price:

Determine whether it's a CALL (breakout) or PUT (breakdown)
Prefer strikes within ±2% (ATM)
For CALLS, slightly above current price (OTM)
For PUTS, slightly below current price (OTM)
Delta between 0.40 and 0.60
Select Expiration Date:

Retrieve all available expirations
Filter for expirations 6–45 days out
Prefer 13–25 DTE for weekly setups or 6–15 DTE for single timeframe
Liquidity Requirements:

Open interest >= 1,000
Spread < $0.05
LEAP
Select Strike Price:

Determine whether it's a CALL (breakout) or PUT (breakdown)
Prefer strikes within ±2% (ATM)
For CALLS, slightly above current price (OTM)
For PUTS, slightly below current price (OTM)
Delta between 0.50 and 0.80 (higher delta for LEAPs)
Select Expiration Date:

Retrieve all available expirations
Filter for expirations 330–395 days out (~1 year)
Target closest to 365 DTE
Liquidity Requirements:

Open interest >= 500
Spread < $0.05




SCALP - Progressive Fallback
LEVEL 0 (Strict - Try First):
    DTE: 0 (same day)
    Delta: 0.35 - 0.60
    Open Interest: >= 500
    Spread: < $0.10
LEVEL 1 (Widen Delta):
    DTE: 0
    Delta: 0.25 - 0.65
    Open Interest: >= 300
    Spread: < $0.15
LEVEL 2 (Add 1DTE):
    DTE: 0 - 1
    Delta: 0.25 - 0.65
    Open Interest: >= 200
    Spread: < $0.15
LEVEL 3 (Add 2DTE):
    DTE: 0 - 2
    Delta: 0.20 - 0.70
    Open Interest: >= 100
    Spread: < $0.20
ABORT: If nothing found after Level 3, skip trade
SWING - Progressive Fallback
LEVEL 0 (Strict - Try First):
    DTE: 13 - 25 (weekly) or 6 - 15 (single)
    Delta: 0.40 - 0.60
    Strike: within ±2% of current price
    Open Interest: >= 1,000
    Spread: < $0.05
LEVEL 1 (Extend DTE Out):
    DTE: 13 - 45 (weekly) or 6 - 30 (single)
    Delta: 0.40 - 0.60
    Strike: within ±2%
    Open Interest: >= 500
    Spread: < $0.08
LEVEL 2 (Extend DTE + Widen Delta & Strike):
    DTE: 13 - 60 (weekly) or 6 - 45 (single)
    Delta: 0.30 - 0.70
    Strike: within ±5%
    Open Interest: >= 300
    Spread: < $0.10
LEVEL 3 (Maximum Flexibility - DTE Only Extends):
    DTE: 13 - 90 (weekly) or 6 - 60 (single)
    Delta: 0.25 - 0.75
    Strike: within ±8%
    Open Interest: >= 200
    Spread: < $0.15
ABORT: If nothing found after Level 3, skip trade
LEAP - Progressive Fallback
LEVEL 0 (Strict - Try First):
    DTE: 330 - 395
    Delta: 0.50 - 0.80
    Strike: within ±2%
    Open Interest: >= 500
    Spread: < $0.05
LEVEL 1 (Widen DTE):
    DTE: 270 - 450
    Delta: 0.50 - 0.80
    Strike: within ±2%
    Open Interest: >= 300
    Spread: < $0.08
LEVEL 2 (Widen Delta + Strike):
    DTE: 180 - 500
    Delta: 0.40 - 0.85
    Strike: within ±5%
    Open Interest: >= 200
    Spread: < $0.10
LEVEL 3 (Maximum Flexibility):
    DTE: 120 - 550
    Delta: 0.35 - 0.90
    Strike: within ±8%
    Open Interest: >= 100
    Spread: < $0.15
ABORT: If nothing found after Level 3, skip trade
The Logic Flow
FOR each level (0, 1, 2, 3):

Search options chain with THIS level's parameters
IF matches found:
 → Score each match (closest to ideal delta + shortest DTE)
 → Pick the BEST scoring match
 → Tag the alert with the fallback level used
 → DONE

IF no matches:
 → Log why (no contracts? bad spread? low OI?)
 → Move to NEXT level

IF all levels exhausted:
    → Skip trade
    → Log "No viable contract found for [ticker]"
Key Rules
Rule    Why
Swing: Never shorten DTE, only extend    Protects your time in the trade
Always widen DTE first    More expirations = more contracts to pick from
Then widen delta    Slightly deeper ITM or OTM is better than bad DTE
Lower OI last    Liquidity is most important for safety
Never go below 100 OI    Too risky for fills
Tag fallback level on alerts    So you know when quality dropped
Abort after Level 3    Better to skip than force a bad trade