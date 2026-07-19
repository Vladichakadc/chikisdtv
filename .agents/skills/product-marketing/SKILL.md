---
name: product-marketing
description: "When the user wants to create or update their product marketing context document. Also use when the user mentions 'product context,' 'marketing context,' 'set up context,' 'positioning,' 'who is my target audience,' 'describe my product,' 'ICP,' 'ideal customer profile,' or wants to avoid repeating foundational information across marketing tasks. Use this at the start of any new project before using other marketing skills — it creates `.agents/product-marketing.md` that all other skills reference for product, audience, and positioning context."
metadata:
  version: 2.1.0
  source: https://github.com/coreyhaines31/marketingskills
---

# Product Marketing Context

You help users create and maintain a product marketing context document. This captures foundational positioning and messaging information that other marketing skills reference, so users don't repeat themselves.

The document is stored at `.agents/product-marketing.md`.

## Workflow

### Step 1: Check for Existing Context

First, check if `.agents/product-marketing.md` already exists. Also check `.claude/product-marketing.md` and the legacy filename `product-marketing-context.md` (in either `.agents/` or `.claude/`) for older setups — if found anywhere other than `.agents/product-marketing.md`, offer to move it to the canonical location.

**If it exists:**
- Read it and summarize what's captured — note its current **Document version** and the last few **Changelog** entries so the user sees where the doc stands and what's changed recently
- Ask which sections they want to update
- Only gather info for those sections
- On any substantive save, bump the version and add a changelog entry (see Step 4). This doc is the shared context every other marketing skill reads, so a dated paper trail of *what changed and why* is worth keeping.

**If it doesn't exist, offer two options:**

1. **Auto-draft from codebase** (recommended): You'll study the repo—README, landing pages, marketing copy, package.json, etc.—and draft a V1 of the context document. The user then reviews, corrects, and fills gaps. This is faster than starting from scratch.

2. **Start from scratch**: Walk through each section conversationally, gathering info one section at a time.

Most users prefer option 1. After presenting the draft, ask: "What needs correcting? What's missing?"

### Step 2: Gather Information

**If auto-drafting:**
1. Read the codebase: README, landing pages, marketing copy, about pages, meta descriptions, package.json, any existing docs
2. Draft all sections based on what you find
3. Present the draft and ask what needs correcting or is missing
4. Iterate until the user is satisfied

**If starting from scratch:**
Walk through each section below conversationally, one at a time. Don't dump all questions at once.

For each section:
1. Briefly explain what you're capturing
2. Ask relevant questions
3. Confirm accuracy
4. Move to the next

Push for verbatim customer language — exact phrases are more valuable than polished descriptions because they reflect how customers actually think and speak, which makes copy more resonant.

---

## Sections to Capture

### 1. Product Overview
- One-line description
- What it does (2-3 sentences)
- Product category (what "shelf" you sit on—how customers search for you)
- Product type (SaaS, marketplace, e-commerce, service, etc.)
- Business model and pricing

### 2. Target Audience
- Target company type (industry, size, stage)
- Target decision-makers (roles, departments)
- Primary use case (the main problem you solve)
- Jobs to be done (2-3 things customers "hire" you for)
- Specific use cases or scenarios

### 3. Personas (B2B only)
If multiple stakeholders are involved in buying, capture for each:
- User, Champion, Decision Maker, Financial Buyer, Technical Influencer
- What each cares about, their challenge, and the value you promise them

### 4. Problems & Pain Points
- Core challenge customers face before finding you
- Why current solutions fall short
- Emotional impact (frustration, risk, missed opportunity)
- Trigger events that make someone look for a solution

### 5. Value Proposition
- Primary value prop (one sentence)
- Top 3 benefits (outcomes, not features)
- What makes you different from alternatives
- What customers say after they start using it

### 6. Features & Capabilities (Summary)
- Core features (brief list)
- Unique or differentiating capabilities
- Integrations (if relevant)

### 7. Competitive Landscape
- Primary competitors (direct)
- Alternative solutions (indirect)
- How you position against each
- Where you win and where you lose

### 8. Social Proof
- Customer count or notable customers
- Key metrics or results
- Testimonials (verbatim quotes if possible)
- Case study highlights

### 9. Messaging & Voice
- Brand voice (2-3 adjectives)
- Tone examples
- Words/phrases to use
- Words/phrases to avoid
- Any messaging guidelines

### 10. Objections & Responses
- Common reasons people don't buy
- How you address each objection

---

## Step 3: Document Format

Save the document at `.agents/product-marketing.md` with this structure:

```markdown
# Product Marketing Context

**Product:** [Name]
**Document version:** 1.0
**Last updated:** [Date]

---

## 1. Product Overview
[Content]

## 2. Target Audience
[Content]

## 3. Personas
[Content]

## 4. Problems & Pain Points
[Content]

## 5. Value Proposition
[Content]

## 6. Features & Capabilities
[Content]

## 7. Competitive Landscape
[Content]

## 8. Social Proof
[Content]

## 9. Messaging & Voice
[Content]

## 10. Objections & Responses
[Content]

---

## Changelog
- v1.0 [Date]: Initial document created
```

## Step 4: Version and Changelog

On every substantive update:
- Bump the version number (1.0 → 1.1 for minor updates, 1.0 → 2.0 for major rewrites)
- Add a changelog entry with date and summary of what changed and why

Keep the changelog brief — one line per entry is fine.

---

## Important Notes

- This document is the foundation for all other marketing skills
- Other skills will reference `.agents/product-marketing.md` to avoid asking redundant questions
- Keep it honest and specific — avoid generic marketing language
- Update it whenever strategy or positioning changes
