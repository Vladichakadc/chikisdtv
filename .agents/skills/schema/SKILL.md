---
name: schema
description: When the user wants to add structured data or schema markup to their website. Also use when the user mentions "schema markup," "structured data," "JSON-LD," "rich results," "rich snippets," "knowledge panel," "FAQ schema," "HowTo schema," "Product schema," "Review schema," "schema.org," or "how to get rich results in Google." Use this for implementing structured data. For overall SEO auditing, see seo-audit. For AI search visibility, see ai-seo.
metadata:
  version: 2.0.0
  source: https://github.com/coreyhaines31/marketingskills
---

# Schema Markup & Structured Data

You are an expert in structured data and schema markup. Your goal is to help implement schema that enables rich results in search and improves how AI systems understand your content.

## What Is Schema Markup?

Structured data (schema.org) is code (usually JSON-LD) added to web pages to help search engines and AI systems understand the content and display rich results.

**Rich results examples:**
- FAQ dropdowns in search results
- Star ratings under product listings
- Recipe cards with cook time and ingredients
- Event listings with date and location
- Sitelinks searchbox in branded searches

---

## Implementation Method

**Recommended: JSON-LD** (injected in `<head>` or `<body>` via `<script>` tag)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [...]
}
</script>
```

Why JSON-LD: Easiest to implement, maintain, and update. Google prefers it.

---

## Schema Types by Priority

### High Impact for Most Sites

**FAQPage** — Enables FAQ rich results in search
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is [product]?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[Answer text]"
      }
    }
  ]
}
```

**Organization** — Helps Google understand your brand
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Company Name",
  "url": "https://company.com",
  "logo": "https://company.com/logo.png",
  "sameAs": [
    "https://twitter.com/company",
    "https://linkedin.com/company/company"
  ]
}
```

**WebSite** — Enables sitelinks searchbox
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Company Name",
  "url": "https://company.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://company.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

**BreadcrumbList** — Shows breadcrumb path in search results
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://company.com"},
    {"@type": "ListItem", "position": 2, "name": "Blog", "item": "https://company.com/blog"},
    {"@type": "ListItem", "position": 3, "name": "Article Title"}
  ]
}
```

### SaaS / B2B Specific

**SoftwareApplication**
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Product Name",
  "applicationCategory": "BusinessApplication",
  "offers": {
    "@type": "Offer",
    "price": "29",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "256"
  }
}
```

### E-commerce

**Product** — Star ratings, price in search results
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product Name",
  "image": ["https://example.com/photo.jpg"],
  "offers": {
    "@type": "Offer",
    "url": "https://example.com/product",
    "priceCurrency": "USD",
    "price": "49.99",
    "availability": "https://schema.org/InStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "reviewCount": "128"
  }
}
```

---

## Testing & Validation

**Google Rich Results Test**: https://search.google.com/test/rich-results  
**Schema Markup Validator**: https://validator.schema.org/

**After implementing:**
- Test with Rich Results Test tool
- Submit pages to Search Console for reindexing
- Monitor Search Console for structured data errors
- Check for rich results appearing in 2-4 weeks
