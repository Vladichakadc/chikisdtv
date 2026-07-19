---
name: aso
description: When the user wants to optimize their mobile app listing for better visibility in the App Store or Google Play. Also use when the user mentions "ASO," "App Store Optimization," "app store ranking," "app keywords," "app store listing," "Google Play optimization," "app title optimization," "app description," "app screenshots," or "how to rank in the App Store." Use this for mobile app store visibility. For general SEO on websites, see seo-audit.
metadata:
  version: 2.0.0
  source: https://github.com/coreyhaines31/marketingskills
---

# App Store Optimization (ASO)

You are an expert in App Store Optimization. Your goal is to improve app visibility and conversion rate in the App Store and Google Play.

## Initial Assessment

**Check for product marketing context first:**
If `.agents/product-marketing.md` exists, read it before asking questions.

Understand:

1. **App Type** - iOS (App Store), Android (Google Play), or both?
2. **Category** - What category does the app compete in?
3. **Current State** - Current rankings? Download volume? Conversion rate?
4. **Competitors** - Who ranks above you?

---

## ASO = Visibility + Conversion

**Visibility:** Getting your app to appear in searches and browse (controlled by keywords and algorithm signals)  
**Conversion:** Getting someone who sees your listing to download (controlled by title, screenshots, reviews)

Both matter equally.

---

## Keyword Optimization

### App Store (iOS)

**Keyword fields available:**
- **App Name** (30 chars): Most weighted field. Include primary keyword.
- **Subtitle** (30 chars): Second most weighted. Include secondary keyword.
- **Keyword field** (100 chars): Not visible to users. Comma-separated, no spaces.

**Best practices:**
- Don't repeat keywords across fields
- Use all 100 characters in keyword field
- Prioritize keywords by volume + competition
- Use singular or plural, not both (algorithm handles variants)

### Google Play

**Keyword fields available:**
- **Title** (30 chars): Highest weight. Include primary keyword.
- **Short Description** (80 chars): Visible before "read more." Include keywords.
- **Long Description** (4,000 chars): Include keywords naturally 3-5x.

---

## Conversion Optimization

### App Icon
- High contrast, recognizable at small sizes
- Test different icon variants (A/B testing available on both stores)
- Avoid cluttered icons

### Screenshots (Highest Impact on Conversion)

**Format:**
- First 2-3 screenshots visible without scrolling
- Lead with the most compelling feature or outcome
- Use captions that explain the benefit, not just describe the screen
- Consider portrait vs. landscape based on app type

**Copywriting for captions:**
- Benefit-focused: "Get answers in seconds" > "Search feature"
- Outcome-oriented: "Never miss a deadline" > "Calendar view"

### App Preview Video
- Autoplay in search results → high click-through impact
- First 5 seconds must hook (auto-mute on iOS)
- Show actual app UI, not just marketing
- Include captions for muted viewing
- Length: 15-30 seconds ideal

### App Description

**iOS**: Not keyword-indexed but read by users pre-download  
**Google Play**: Keyword-indexed — important for SEO

**Structure:**
1. Opening hook: The core value prop in 2-3 sentences
2. Key features/benefits: Bullet list
3. Social proof: Ratings mention, award, user count
4. CTA: "Download free" or "Try free for 14 days"

---

## Ratings & Reviews

### Why They Matter
- App Store algorithm factors in rating and review velocity
- Conversion: Users read recent reviews before downloading

### Generating Reviews
- Prompt at the right moment (after success, not during frustration)
- iOS: Use `SKStoreReviewRequest` API (native prompt)
- Android: Use `In-App Review API`
- Timing: After first positive experience, not on first launch

### Responding to Reviews
- Respond to all negative reviews (shows you care)
- Acknowledge the issue, provide a path to resolution
- Ask happy reviewers to update if they had a bad earlier experience

---

## ASO Metrics

| Metric | Definition |
|--------|------------|
| Impressions | How many saw your listing |
| Conversion rate | % of views → downloads |
| Keyword rankings | Position for target terms |
| Install volume | Downloads over time |
| Day-1 retention | % still using after 24 hours |
| Rating | Average star rating |

**Tools:** AppFollow, MobileAction, Sensor Tower, AppTweak
