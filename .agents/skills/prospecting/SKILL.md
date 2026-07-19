---
name: prospecting
description: When the user wants to find, qualify, or build a list of sales prospects. Also use when the user mentions "prospecting," "lead list," "finding prospects," "ICP list," "outbound prospecting," "sales prospecting," "target account list," "finding leads," "building a prospect list," "lead generation," "enriching leads," or "qualifying prospects." Use this for finding and qualifying who to reach out to. For what to say to prospects, see cold-email.
metadata:
  version: 2.0.0
  source: https://github.com/coreyhaines31/marketingskills
---

# Prospecting

You are an expert in sales prospecting. Your goal is to help identify, qualify, and build lists of high-quality prospects who match your ideal customer profile.

## Initial Assessment

**Check for product marketing context first:**
If `.agents/product-marketing.md` exists, read it before asking questions.

Understand before prospecting:

1. **ICP** - Who is your ideal customer? (Industry, company size, role, tech stack)
2. **Goal** - How many prospects do you need? What pipeline are you building?
3. **Tools** - What prospecting tools do you have? (Apollo, LinkedIn Sales Navigator, ZoomInfo)

---

## Defining Your ICP for Prospecting

**Firmographic criteria** (company characteristics):
- Industry / vertical
- Company size (employees, revenue)
- Geography
- Business model (B2B vs B2C)
- Growth stage (startup, SMB, enterprise)

**Technographic criteria** (technology they use):
- Tech stack signals (what tools do they already use?)
- Tools that indicate readiness (using a competitor, or adjacent tool)

**Behavioral criteria** (signals they're ready):
- Hiring for roles your product supports
- Recent funding (growth signal)
- Recent leadership change
- Product expansion signals (new markets, offices)

---

## Prospecting Sources

### LinkedIn / LinkedIn Sales Navigator

**Best for:** B2B, finding specific roles and companies

**Boolean search operators:**
```
"VP of Marketing" OR "Head of Marketing" AND "SaaS" NOT "agency"
```

**Sales Navigator filters:**
- Company headcount
- Job title + seniority
- Industry
- Posted content in last 30 days (indicates active)
- Changed jobs in last 90 days (new leader = new opportunities)

### Apollo.io

- Search by title, company, industry, size, location
- Email + phone number enrichment
- Technographic filters
- Engagement signals (has opened emails before)

### Other Sources
- ZoomInfo — Enterprise, richest data
- Clearbit — Data enrichment + intent data
- Hunter.io — Email finding by domain
- Crunchbase — Funding and company data
- BuiltWith — Technographic data (what tech companies use)
- G2 — Companies that reviewed competitors

---

## Intent Signals

**High-intent signals to target:**
- Using a competitor (technographic)
- Hiring for a role your product supports (job board scraping)
- Recently raised funding (Crunchbase)
- Decision maker changed recently (LinkedIn)
- Posted about the problem you solve (LinkedIn content monitoring)
- Visited your pricing page (reverse IP lookup tools)

**Intent data tools:** Bombora, G2 Buyer Intent, 6sense, Demandbase

---

## Qualifying Prospects

### BANT (Classic)
- **B**udget: Do they have money for this?
- **A**uthority: Can they make or influence the decision?
- **N**eed: Do they have the problem you solve?
- **T**imeline: Are they looking to solve it now?

### MEDDIC (Enterprise)
- **M**etrics: What quantifiable value do they expect?
- **E**conomic Buyer: Who approves the budget?
- **D**ecision Criteria: What are they evaluating on?
- **D**ecision Process: How do they make decisions?
- **I**dentify Pain: What's the compelling event?
- **C**hampion: Who internally sells for you?

---

## Building Your List

### List Quality Over Quantity

Bad list: 1,000 contacts, 10% fit your ICP  
Good list: 200 contacts, 90% fit your ICP

**Prioritize:** Reach your best-fit 200 before spraying to everyone.

### Enrichment Checklist
For each prospect, capture:
- [ ] Name + title
- [ ] LinkedIn URL
- [ ] Company name
- [ ] Company website
- [ ] Verified email (or LinkedIn for first contact)
- [ ] Recent trigger/signal (why them, why now)
- [ ] Any mutual connections

### List Hygiene
- Validate emails before sending (NeverBounce, ZeroBounce)
- Remove bounced emails after first send
- Segment by ICP tier (Tier 1 = perfect fit, Tier 2 = good fit, Tier 3 = possible)
