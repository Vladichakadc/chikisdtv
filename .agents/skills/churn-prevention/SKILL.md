---
name: churn-prevention
description: "When the user wants to reduce churn, build cancellation flows, set up save offers, recover failed payments, or implement retention strategies. Also use when the user mentions 'churn,' 'cancel flow,' 'offboarding,' 'save offer,' 'dunning,' 'failed payment recovery,' 'win-back,' 'retention,' 'exit survey,' 'pause subscription,' 'involuntary churn,' 'people keep canceling,' 'churn rate is too high,' 'how do I keep users,' or 'customers are leaving.' Use this whenever someone is losing subscribers or wants to build systems to prevent it. For post-cancel win-back email sequences, see emails. For in-app upgrade paywalls, see paywalls."
metadata:
  version: 2.0.0
  source: https://github.com/coreyhaines31/marketingskills
---

# Churn Prevention

You are an expert in SaaS retention and churn prevention. Your goal is to help reduce both voluntary churn (customers choosing to cancel) and involuntary churn (failed payments) through well-designed cancel flows, dynamic save offers, proactive retention, and dunning strategies.

## Before Starting

**Check for product marketing context first:**
If `.agents/product-marketing.md` exists, read it before asking questions.

### 1. Current Churn Situation
- What's your monthly churn rate? (Voluntary vs. involuntary if known)
- How many active subscribers?
- What's the average MRR per customer?
- Do you have a cancel flow today, or does cancel happen instantly?

### 2. Billing & Platform
- What billing provider? (Stripe, Chargebee, Paddle, Recurly)
- Monthly, annual, or both billing intervals?
- Do you support plan pausing or downgrades?

---

## Churn Types

| Type | Cause | Solution |
|------|-------|----------|
| **Voluntary** | Customer chooses to cancel | Cancel flows, save offers, exit surveys |
| **Involuntary** | Payment fails | Dunning emails, smart retries, card updaters |

---

## Cancel Flow Design

### The Cancel Flow Structure

```
Trigger → Exit Survey → Dynamic Save Offer → Confirmation → Post-Cancel
```

### Exit Survey Design

| Reason | What It Tells You |
|--------|-------------------|
| Too expensive | Price sensitivity → discount or downgrade |
| Not using it enough | Low engagement → pause or onboarding help |
| Missing a feature | Product gap → show roadmap or workaround |
| Switching to competitor | Competitive pressure → understand what they offer |
| Technical issues / bugs | Product quality → escalate to support |
| Temporary / seasonal need | Usage pattern → offer pause |
| Business closed / changed | Unavoidable → let go gracefully |

**Survey best practices:**
- 1 question, single-select with optional free text
- 5-8 reason options max (avoid decision fatigue)
- "Help us improve" framing works better than "Why are you leaving?"

### Dynamic Save Offers

| Cancel Reason | Primary Offer | Fallback Offer |
|---------------|---------------|----------------|
| Too expensive | Discount (20-30% for 2-3 months) | Downgrade to lower plan |
| Not using it enough | Pause (1-3 months) | Free onboarding session |
| Missing feature | Roadmap preview + timeline | Workaround guide |
| Switching to competitor | Competitive comparison + discount | Feedback session |
| Technical issues | Escalate to support immediately | Credit + priority fix |
| Temporary / seasonal | Pause subscription | Downgrade temporarily |
| Business closed | Skip offer (respect the situation) | — |

### Save Offer Details

**Discount**
- 20-30% off for 2-3 months is the sweet spot
- Avoid 50%+ discounts (trains customers to cancel for deals)
- Show the dollar amount saved, not just the percentage

**Pause subscription**
- 1-3 month pause maximum
- 60-80% of pausers eventually return to active
- Auto-reactivation with advance notice email

**Plan downgrade**
- Position as "right-size your plan" not "downgrade"
- Show what they keep vs. what they lose
- Easy path back up when ready

---

## Dunning (Involuntary Churn)

### Email Sequence for Failed Payments

| Day | Email | Goal |
|-----|-------|------|
| 0 | Payment failed — update card | Immediate card update |
| 3 | Gentle reminder | Update before access interrupted |
| 7 | Access will be paused soon | Urgency without threat |
| 10 | Access paused — update to restore | Urgency |
| 14-21 | Win-back offer (optional) | Last chance recovery |

### Smart Retry Strategy

- Retry immediately after failure
- Wait 2-3 days, retry again
- Try different day of week/time
- Retry after 7 days
- Final retry at 14-21 days before writing off

---

## Proactive Retention

### Identify At-Risk Users Before They Cancel

**Signals:**
- Engagement drop (logging in less frequently)
- Feature usage decline
- Support tickets (especially multiple issues)
- No login in 7+ days

**Proactive outreach:**
- Success check-in email
- Personalized tip based on their use case
- Offer a call with customer success (high-value accounts)

---

## Key Metrics

- **Voluntary churn rate**: % of subscribers who actively cancel per month
- **Involuntary churn rate**: % who cancel due to failed payments
- **Cancel flow save rate**: % of users who start cancel flow but don't complete it
- **Dunning recovery rate**: % of failed payments eventually recovered
