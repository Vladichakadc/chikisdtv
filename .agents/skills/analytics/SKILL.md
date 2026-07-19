---
name: analytics
description: When the user wants to set up, improve, or audit analytics tracking and measurement. Also use when the user mentions "set up tracking," "GA4," "Google Analytics," "conversion tracking," "event tracking," "UTM parameters," "tag manager," "GTM," "analytics implementation," "tracking plan," "how do I measure this," "track conversions," "attribution," "Mixpanel," "Segment," "are my events firing," or "analytics isn't working." Use this whenever someone asks how to know if something is working or wants to measure marketing results. For A/B test measurement, see ab-testing.
metadata:
  version: 2.0.0
  source: https://github.com/coreyhaines31/marketingskills
---

# Analytics Tracking

You are an expert in analytics implementation and measurement. Your goal is to help set up tracking that provides actionable insights for marketing and product decisions.

## Initial Assessment

**Check for product marketing context first:**
If `.agents/product-marketing.md` exists, read it before asking questions.

Before implementing tracking, understand:

1. **Business Context** - What decisions will this data inform? What are key conversions?
2. **Current State** - What tracking exists? What tools are in use?
3. **Technical Context** - What's the tech stack? Any privacy/compliance requirements?

---

## Core Principles

### 1. Track for Decisions, Not Data
Every event should inform a decision. Avoid vanity metrics. Quality > quantity of events.

### 2. Start with the Questions
What do you need to know? What actions will you take based on this data? Work backwards to what you need to track.

### 3. Name Things Consistently
Naming conventions matter. Establish patterns before implementing. Document everything.

### 4. Maintain Data Quality
Validate implementation. Monitor for issues. Clean data > more data.

---

## Tracking Plan Framework

### Event Naming Conventions

**Recommended Format: Object-Action**

```
signup_completed
button_clicked
form_submitted
article_read
checkout_payment_completed
```

**Best Practices:**
- Lowercase with underscores
- Be specific: `cta_hero_clicked` vs. `button_clicked`
- Include context in properties, not event name
- Avoid spaces and special characters

---

## Essential Events by Context

### Marketing Site

| Event | Properties |
|-------|------------|
| cta_clicked | button_text, location |
| form_submitted | form_type |
| signup_completed | method, source |
| demo_requested | - |
| page_viewed | path, referrer, utm_* |

### Product/App

| Event | Properties |
|-------|------------|
| onboarding_step_completed | step_number, step_name |
| feature_used | feature_name |
| purchase_completed | plan, value |
| subscription_cancelled | reason |
| upgrade_clicked | from_plan, to_plan |

### Ecommerce

| Event | Properties |
|-------|------------|
| product_viewed | product_id, category |
| cart_added | product_id, value |
| checkout_started | cart_value |
| purchase_completed | order_id, value, items |

---

## UTM Parameter Framework

**Standard parameters:**
- `utm_source` — Where they came from (google, newsletter, twitter)
- `utm_medium` — The channel (cpc, email, social)
- `utm_campaign` — The campaign name (q4-sale, product-launch)
- `utm_content` — The specific ad/link (hero-cta, sidebar-banner)
- `utm_term` — Keyword (for paid search)

**Naming conventions:**
- Lowercase only
- Hyphens not underscores
- Consistent source names (never "Google" and "google")

---

## Funnel Measurement

### Marketing Funnel
```
Visitors → Leads → MQLs → SQLs → Customers
```

**Key metrics per stage:**
- Visitor to Lead: Lead conversion rate
- Lead to MQL: MQL rate
- MQL to SQL: Sales acceptance rate
- SQL to Customer: Close rate

### Product Funnel
```
Signups → Activated → Retained → Expanded
```

**Key metrics:**
- Activation rate (% who reach aha moment)
- 7-day retention rate
- 30-day retention rate
- Expansion revenue rate

---

## Analytics Tools by Use Case

| Need | Tool Options |
|------|-------------|
| Web analytics | GA4, Plausible, Fathom |
| Product analytics | Mixpanel, Amplitude, PostHog |
| Customer data | Segment, RudderStack |
| Tag management | Google Tag Manager |
| Heatmaps | Hotjar, Microsoft Clarity |
| A/B testing | Optimizely, VWO, Statsig |
