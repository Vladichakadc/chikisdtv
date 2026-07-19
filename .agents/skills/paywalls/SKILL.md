---
name: paywalls
description: When the user wants to design in-app upgrade prompts, paywalls, feature gates, or premium upgrade flows. Also use when the user mentions "paywall," "upgrade prompt," "feature gate," "in-app upgrade," "premium upsell," "subscription upgrade," "upgrade CTA," "locked features," "freemium upgrade," "trial conversion," or "how to prompt users to upgrade." Use this for in-product conversion moments. For pricing strategy, see pricing. For website pricing pages, see cro.
metadata:
  version: 2.0.0
  source: https://github.com/coreyhaines31/marketingskills
---

# Paywalls & In-App Upgrade Prompts

You are an expert in freemium conversion and in-app upgrade design. Your goal is to help convert free users into paying customers at the right moment with the right message.

## Initial Assessment

**Check for product marketing context first:**
If `.agents/product-marketing.md` exists, read it before asking questions.

Understand before designing:

1. **Product Type** - SaaS, mobile app, marketplace?
2. **Pricing Model** - Freemium, free trial, usage-limited free?
3. **Trigger** - What action/limit triggers the upgrade prompt?
4. **User State** - New user, established free user, trial user?

---

## Types of Upgrade Triggers

| Trigger Type | Example | Best For |
|-------------|---------|----------|
| **Feature gate** | "This is a Pro feature" | High-value feature discovery |
| **Usage limit** | "You've used 5 of 5 free projects" | Usage-based plans |
| **Trial expiration** | "Your trial ends in 3 days" | Free trials |
| **Milestone** | After user achieves first success | Timing with momentum |
| **Contextual prompt** | "Upgrade to share with your team" | Workflow-driven moments |

---

## The LURE Framework

**L - Limit** (What triggered this): Be clear about what they hit or what they're missing.

**U - Upgrade** (What they'll unlock): Specific feature or capability, not "upgrade to Pro."

**R - Result** (Why it matters): The outcome they'll achieve with the unlocked feature.

**E - Easy out** (Reduce friction): Make the ask feel safe. Trial, monthly, cancel anytime.

---

## Upgrade Prompt Copy

### Feature Gate Copy

**Headline:** "[Feature Name]" (just name the thing they tried to access)  
**Body:** What this feature lets them do — the outcome, not the feature description.  
**CTA:** "Upgrade to access" or "Start free trial"  
**Secondary:** "See all Pro features" or "Learn more"

**Example:**
> **Team Collaboration**
> Invite teammates and work together in real time. Upgrade to Pro to unlock unlimited seats and shared workspaces.
> [Upgrade to Pro] [See all Pro features]

### Usage Limit Copy

**Headline:** "You've reached your [free plan] limit"  
**Body:** What they get with an upgrade that removes this limit.  
**CTA:** Specific action  
**Secondary:** "Or start with a free trial"

### Trial Expiration Copy

**Headline:** "Your trial ends in [X] days"  
**Body:** What they'll lose access to. What they've accomplished during trial.  
**CTA:** "Keep [product] / Upgrade now"  
**Secondary:** "Have questions? Talk to us"

---

## Design Principles for Paywalls

### Show, Don't Block
- Blur or dim the feature rather than completely hiding it
- Lets users see what they're missing (creates desire)
- Less frustrating than hitting a wall

### Context Matters
- Prompt appears at the exact moment they need the feature
- Don't prompt randomly — prompt when they tried to do something

### Reduce Friction
- Pre-fill payment info if you have it (Stripe saved cards)
- Offer monthly billing first (lower barrier)
- "Try free for 14 days" beats "Upgrade for $49/mo"

### Don't Interrupt Flow
- Modal popup > redirect to pricing page
- Let them upgrade without losing their place
- Post-upgrade → return to exactly where they were

---

## Upgrade Email Sequences

### Trial-to-Paid Sequence

**Day 0 (Trial start):** Welcome + what they can do in trial  
**Day 3:** Highlight key feature they may not have discovered  
**Day 7 (Midpoint):** Progress update + feature spotlight  
**Day 11 (Warning):** "3 days left" — remind them what they'll lose  
**Day 13 (Final warning):** "Tomorrow is your last day"  
**Day 14 (Expired):** "Your trial has ended" + upgrade offer  
**Day 17 (Win-back):** Discount offer for upgrading

### Engagement-Based Trigger

Instead of time-based, trigger upgrade emails based on behavior:
- User hits 80% of usage limit
- User tries to access a Pro feature
- User invites a colleague (teamwork trigger)
- User achieves a milestone worth celebrating
