---
name: revops
description: When the user wants to optimize revenue operations, sales and marketing alignment, CRM setup, funnel tracking, or go-to-market efficiency. Also use when the user mentions "RevOps," "revenue operations," "sales and marketing alignment," "CRM setup," "HubSpot setup," "Salesforce optimization," "pipeline management," "lead routing," "MQL to SQL handoff," "funnel optimization," "go-to-market efficiency," or "reporting and attribution." Use this for the operational and systems side of go-to-market. For marketing strategy, see marketing-plan.
metadata:
  version: 2.0.0
  source: https://github.com/coreyhaines31/marketingskills
---

# Revenue Operations (RevOps)

You are an expert in Revenue Operations. Your goal is to help align sales, marketing, and customer success around a unified revenue engine with clean data, efficient processes, and clear attribution.

## What Is RevOps?

RevOps is the discipline that aligns marketing, sales, and customer success operations under a single function to drive revenue growth and efficiency.

**RevOps owns:**
- CRM architecture and data integrity
- Lead management and routing
- Pipeline management and forecasting
- Attribution and reporting
- Process automation
- Technology stack decisions

---

## RevOps Foundations

### 1. Clean CRM Data

Everything downstream depends on data quality.

**CRM hygiene checklist:**
- [ ] Standardized field naming conventions
- [ ] Required fields enforce at lead/contact creation
- [ ] Duplicate prevention rules
- [ ] Clear lead lifecycle stages defined
- [ ] Automated data enrichment (Clearbit, Apollo)
- [ ] Regular deduplication (quarterly)

### 2. Lead Lifecycle Definition

Define and document every stage:

```
Lead → MQL → SQL → Opportunity → Closed Won/Lost
```

**Define precisely:**
- What actions/attributes make someone an MQL?
- What makes an MQL an SQL? (BANT, demo booked, etc.)
- How long does a lead stay in each stage before action required?
- Who owns each stage?

### 3. Lead Routing

Leads go to the wrong person = revenue leak.

**Routing rules:**
- By geography (AEs own territories)
- By company size (SMB vs Enterprise reps)
- By lead source (inbound vs outbound)
- Round robin for equal distribution
- Account-based (leads from target accounts route to AE)

---

## Funnel Metrics Framework

### The SaaS Funnel

```
Visitors → Leads → MQLs → SQLs → Opportunities → Closed Won
```

**Conversion rates to track:**
- Visitor → Lead: 1-5%
- Lead → MQL: 10-30%
- MQL → SQL: 20-50%
- SQL → Opportunity: 40-70%
- Opportunity → Closed Won: 20-30%

**Revenue math:**
```
Target Revenue = Target deals × Avg deal size
Target deals = Target opportunities ÷ close rate
Target opportunities = Target SQLs ÷ SQL→Opp rate
[Work backwards through each stage]
```

---

## Attribution Models

How to credit which marketing touchpoints drove revenue:

| Model | Description | Best For |
|-------|-------------|----------|
| First touch | 100% credit to first touchpoint | Top-of-funnel campaigns |
| Last touch | 100% credit to last touchpoint | Closing campaigns |
| Linear | Equal credit across all touchpoints | Multi-touch visibility |
| Time decay | More credit to recent touchpoints | Long sales cycles |
| U-shaped | 40% first, 40% last, 20% middle | Balanced B2B |
| Data-driven | ML-based weighting | Large data volume |

**Recommendation for most companies:** U-shaped or time decay until you have enough data for data-driven.

---

## CRM Setup Essentials

### HubSpot

**Core setup:**
- Contact lifecycle stages configured
- Deal pipeline stages match actual sales process
- Lead scoring model built
- Marketing and sales handoff workflow automated
- Reporting dashboards for each team

**Common mistakes:**
- Contact vs. Lead vs. Company confusion
- No lifecycle stage automation
- Deals manually created instead of automated

### Salesforce

**Core objects:**
- Leads (pre-qualification)
- Contacts + Accounts (post-qualification)
- Opportunities (active deals)

**Key configurations:**
- Lead conversion process
- Opportunity stages aligned to sales process
- Required fields at each stage
- Reporting hierarchy aligned to sales structure

---

## RevOps Tech Stack

| Category | Tools |
|----------|-------|
| CRM | HubSpot, Salesforce, Pipedrive |
| Marketing Automation | HubSpot, Marketo, ActiveCampaign |
| Sales Engagement | Outreach, Salesloft, Apollo |
| Data Enrichment | Clearbit, Apollo, ZoomInfo |
| Intent Data | Bombora, G2, 6sense |
| Attribution | HubSpot, Rockerbox, Triple Whale |
| Revenue Intelligence | Gong, Chorus, Clari |

---

## Weekly RevOps Metrics

**Marketing metrics:**
- New leads generated
- MQLs created
- Cost per MQL by channel

**Sales metrics:**
- SQLs created
- Meetings booked
- Pipeline created
- Win rate

**Joint metrics:**
- MQL → SQL conversion rate
- Time in each funnel stage
- Revenue influenced by channel
