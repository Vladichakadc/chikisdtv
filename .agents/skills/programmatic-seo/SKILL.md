---
name: programmatic-seo
description: When the user wants to build pages at scale to rank for long-tail keywords. Also use when the user mentions "programmatic SEO," "programmatic pages," "landing pages at scale," "auto-generated pages," "SEO templates," "long-tail keyword pages," "location pages," "comparison pages," "alternative pages," "category pages at scale," or "build thousands of pages for SEO." Use this when someone wants to build a large quantity of SEO-optimized pages systematically. For individual SEO audits, see seo-audit. For content strategy, see content-strategy.
metadata:
  version: 2.0.0
  source: https://github.com/coreyhaines31/marketingskills
---

# Programmatic SEO

You are an expert in programmatic SEO — building pages at scale to rank for thousands of long-tail keywords. Your goal is to help design and implement page templates that rank and convert.

## What Is Programmatic SEO?

Building large numbers of landing pages automatically (or semi-automatically) using a data source + template, each targeting specific keyword variations.

**Examples:**
- "Best [tool] for [use case]" pages
- "[City] + [service]" location pages
- "[Product A] vs [Product B]" comparison pages
- "[Topic] alternatives" pages
- "[Industry] + [job title]" persona pages

---

## Is Programmatic SEO Right for You?

**Good fit if:**
- You have data to power the pages (products, locations, comparisons, integrations)
- There's search demand for many variations of a keyword pattern
- Each page can offer genuinely unique value (not thin content)

**Bad fit if:**
- You'd just be changing one word per page with no real content differentiation
- The keyword variations have no real search demand
- You don't have data to make pages meaningfully different

---

## The Programmatic SEO Framework

### Step 1: Find the Keyword Pattern

Identify a "head keyword" with many modifiable variations:

**Pattern templates:**
- `[Product] for [use case]` → "CRM for real estate," "CRM for startups"
- `[Tool] alternatives` → "Salesforce alternatives," "HubSpot alternatives"
- `[Your product] vs [competitor]` → "Pipedrive vs HubSpot"
- `Best [category] in [location]` → "Best accountants in Austin"
- `[Adjective] [noun] [modifier]` → "free project management tools for freelancers"

### Step 2: Validate Search Demand

For your keyword pattern:
- How many variations have search volume?
- What's the total addressable traffic?
- Is the intent commercial? (people want to buy or evaluate)

**Tools:** Ahrefs, SEMrush, Google Keyword Planner

### Step 3: Build Your Data Source

You need structured data to populate each page:
- CSV / spreadsheet
- Database
- CMS with custom fields
- API integrations

**What data to include:**
- The variation variable (use case, location, competitor name)
- Unique content for each page (features, reviews, comparisons)
- Metadata (title, description template)

### Step 4: Design the Page Template

Each page needs:
- Dynamic title and H1 incorporating the keyword
- Unique intro paragraph (not just template fill-in-the-blank)
- Substantial, genuinely unique content section
- Relevant data table or comparison
- Internal links to related pages
- Clear CTA

**Template example:**
```
Title: Best [Product] for [Use Case] in [Year]
H1: Best [Product] for [Use Case]
Intro: [Dynamic intro based on use case characteristics]
Section: What to look for in [Product] for [Use Case]
Section: Top [Product] options for [Use Case] [+ data table]
Section: Why [Your Product] works for [Use Case]
CTA: Try [Your Product] free
```

---

## Quality Rules

### The Thin Content Problem
Google penalizes pages with no real value. Each page must:
- Answer the specific question the user has
- Include genuinely unique information (not just variable swaps)
- Provide more value than competitors rank for the same query

### Minimum Content Per Page
- 300+ words of unique, valuable content
- At least one data table, comparison, or unique element
- Proper internal linking

---

## Implementation Options

| Approach | Best For | Technical Level |
|----------|----------|-----------------|
| Webflow CMS | Non-technical teams | Low |
| WordPress + ACF | Content-heavy sites | Medium |
| Next.js + database | Developers, high scale | High |
| Airtable + Webflow | Fastest MVP | Low |

---

## Monitoring Performance

**Track per page cluster:**
- Organic impressions (Search Console)
- Click-through rate
- Average position
- Conversions from these pages

**Watch for:**
- Pages indexed vs. created (Google may not index thin content)
- Duplicate content flags
- Cannibalization (multiple pages competing for same keyword)
