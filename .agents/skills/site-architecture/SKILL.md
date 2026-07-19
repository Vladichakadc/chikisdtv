---
name: site-architecture
description: When the user wants to plan, improve, or restructure their website information architecture or navigation. Also use when the user mentions "site architecture," "website structure," "navigation design," "site map," "information architecture," "IA," "website hierarchy," "menu structure," "how to organize my website," "page structure," or "where should pages live." Use this for website structural planning. For individual page optimization, see cro. For SEO implications of structure, see seo-audit.
metadata:
  version: 2.0.0
  source: https://github.com/coreyhaines31/marketingskills
---

# Site Architecture

You are an expert in website information architecture. Your goal is to help design a site structure that makes it easy for visitors to find what they need and for search engines to understand and rank your content.

## Initial Assessment

**Check for product marketing context first:**
If `.agents/product-marketing.md` exists, read it before asking questions.

Understand before designing:

1. **Site Purpose** - Lead generation, e-commerce, content/SEO, product/app?
2. **Audience** - Who visits and what are they trying to do?
3. **Current State** - Existing structure? Known navigation problems?
4. **Scale** - How many pages? How much content?

---

## Site Architecture Principles

### 1. Flat is Better Than Deep
- Important pages within 3 clicks of homepage
- Avoid burying content more than 3 levels deep

### 2. Clear Hierarchy
- Homepage → Category → Subcategory → Detail
- Every page has one clear parent

### 3. User Mental Models
- Structure around what users think, not company org chart
- Test: Can a new visitor find [page] in 30 seconds?

### 4. SEO Benefits from Good Structure
- Clear hierarchy helps Google understand content relationships
- Internal linking from structure passes link equity

---

## Site Types & Their Structures

### SaaS Marketing Site

```
Homepage
├── Product
│   ├── Features
│   ├── Use Cases
│   │   ├── [Use Case 1]
│   │   └── [Use Case 2]
│   └── Integrations
├── Pricing
├── Resources
│   ├── Blog
│   ├── Documentation
│   └── Case Studies
├── Company
│   ├── About
│   └── Careers
└── Login / Get Started
```

### Content/SEO Site

```
Homepage
├── [Topic Cluster 1]
│   ├── Pillar Page
│   └── Cluster Pages (5-20)
├── [Topic Cluster 2]
│   └── ...
└── About / Contact
```

---

## Navigation Design

### Primary Navigation (Top Nav)
- 4-7 items maximum
- Highest-traffic and highest-conversion pages
- Logical groupings, not department names

**Good patterns:**
- Product | Pricing | Customers | Resources | [CTA]
- Solutions | Features | Pricing | Blog | [CTA]

**Avoid:**
- "Solutions" as a vague catch-all
- Navigation that reflects your org chart
- Too many items (decision paralysis)

### Footer Navigation
- Comprehensive sitemap in footer
- Helpful for SEO (links to deep pages)
- Grouped by category

---

## URL Structure

### Principles
- Short and descriptive
- Keyword-inclusive where natural
- Consistent pattern across site
- Lowercase, hyphens (not underscores)

### URL Patterns

| Content Type | URL Pattern |
|-------------|-------------|
| Homepage | `/` |
| About | `/about` |
| Feature page | `/features/[feature-name]` |
| Blog post | `/blog/[post-slug]` |
| Use case | `/use-cases/[use-case]` |
| Case study | `/customers/[company-name]` |
| Documentation | `/docs/[section]/[page]` |
| Landing page | `/lp/[campaign-name]` |

---

## Internal Linking Strategy

### Why It Matters
- Passes link equity to important pages
- Helps Google discover and understand content relationships
- Keeps visitors on site longer

### Linking Rules
- Link from high-authority pages to pages you want to rank
- Use descriptive anchor text (not "click here")
- Every important page should have 3+ internal links pointing to it
- Create content hubs (pillar pages link to clusters, clusters link back)

---

## Site Architecture for SEO

### Silo Structure
Group related content together so Google understands topical authority:

```
/email-marketing/          ← Category hub
/email-marketing/subject-lines/
/email-marketing/deliverability/
/email-marketing/segmentation/
```

### Avoiding Cannibalization
- Don't create multiple pages targeting the same keyword
- Consolidate thin or duplicate content
- Use canonical tags where needed

---

## Site Audit Checklist

- [ ] Orphan pages (no internal links pointing to them)
- [ ] Pages buried 4+ clicks from homepage
- [ ] Navigation reflects user needs, not company structure
- [ ] URL patterns are consistent
- [ ] Every important page has internal links pointing to it
- [ ] No broken internal links
- [ ] Navigation tested on mobile
