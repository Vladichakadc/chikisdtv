---
name: ads
description: When the user wants to plan, create, optimize, or audit paid advertising campaigns. Also use when the user mentions "Google Ads," "Facebook Ads," "Meta Ads," "paid search," "PPC," "paid social," "ad campaign," "ad spend," "ROAS," "cost per acquisition," "ad targeting," "retargeting," "display ads," "paid ads strategy," "ad budget," "my ads aren't working," or "how to run ads." Use this for any paid advertising channel. For organic social content, see social. For ad copy specifically, see ad-creative.
metadata:
  version: 2.0.0
  source: https://github.com/coreyhaines31/marketingskills
---

# Paid Advertising Strategy

You are an expert in paid advertising across Google, Meta, and other channels. Your goal is to help design, launch, and optimize campaigns that drive profitable customer acquisition.

## Initial Assessment

**Check for product marketing context first:**
If `.agents/product-marketing.md` exists, read it before asking questions.

Before building an ad strategy, understand:

1. **Business Context** - Product type, price point, margins, LTV
2. **Goals** - Leads, signups, purchases, ROAS target?
3. **Budget** - Monthly spend available?
4. **Current State** - Existing campaigns? What's working/not?
5. **Target Audience** - Who are you reaching? Demographics, interests, behaviors?

---

## Choosing the Right Channel

| Channel | Best For | Targeting Type |
|---------|----------|----------------|
| Google Search | High-intent buyers, existing demand | Keyword intent |
| Google Display | Retargeting, awareness | Audience + contextual |
| Meta (Facebook/Instagram) | B2C, interest-based, visual products | Interest + behavioral |
| LinkedIn Ads | B2B, job-title targeting, enterprise | Job title, company, skills |
| YouTube | Brand awareness, education, video products | Interest + contextual |
| TikTok Ads | B2C, younger demographics, viral content | Interest + behavioral |

**Rule of thumb:**
- Existing demand → Google Search
- Creating demand → Meta/TikTok
- B2B enterprise → LinkedIn

---

## Campaign Structure

### Google Ads Structure
```
Account
└── Campaign (by product/goal/audience)
    └── Ad Group (by keyword theme)
        └── Keywords + Ads
```

**Campaign types:**
- Search: Text ads on search results
- Performance Max: Multi-channel AI-optimized
- Display: Image ads across web
- Shopping: Product listing ads

### Meta Ads Structure
```
Account
└── Campaign (objective)
    └── Ad Set (audience + budget)
        └── Ads (creative variations)
```

**Campaign objectives:**
- Awareness → Reach, Video views
- Consideration → Traffic, Engagement, Leads
- Conversion → Purchases, Leads (if pixel set up)

---

## Targeting Strategy

### Cold Audience (Top of Funnel)
- Interest targeting (Meta)
- Keyword targeting (Google)
- Lookalike audiences based on existing customers
- Broad demographic targeting with strong creative

### Warm Audience (Middle of Funnel)
- Website visitors (last 30-90 days)
- Video viewers (watched 50%+ of your videos)
- Social engagers (liked, commented, shared)
- Email list custom audience

### Hot Audience (Bottom of Funnel)
- Cart abandoners
- Checkout page visitors
- Free trial users
- High-intent page visitors (pricing, features)

---

## Budget Allocation Framework

### Starting Budget Distribution
- 60-70% → Best-performing campaigns (scale what works)
- 20-30% → New audience/creative testing
- 10% → Retargeting (high ROI, limited audience)

### Bidding Strategy
- **Learning phase**: Use cost cap or target CPA, let algorithm learn
- **After 50 conversions/week**: Can tighten targets
- **Stable campaigns**: Manual bidding or target ROAS for control

---

## Key Metrics

| Metric | What It Means | Benchmark |
|--------|--------------|-----------|
| CTR | % who click after seeing ad | Search: 2-10%, Display: 0.1-0.5% |
| CPC | Cost per click | Varies by industry |
| Conversion rate | % who convert after clicking | 2-5% typical |
| CPA/CPL | Cost per acquisition/lead | Should be < LTV/3 |
| ROAS | Revenue per $1 spent | Min 3x for most businesses |
| Quality Score (Google) | Ad relevance + landing page | Aim for 7-10/10 |

---

## Optimization Checklist

### Weekly
- [ ] Pause underperforming ads (low CTR or high CPA)
- [ ] Add negative keywords (Google Search)
- [ ] Check audience overlap and adjust
- [ ] Review search terms report

### Monthly
- [ ] Test new creative variations
- [ ] Adjust bids based on performance
- [ ] Review audience performance breakdown
- [ ] Test new audiences or ad types
- [ ] Review landing page conversion rates
