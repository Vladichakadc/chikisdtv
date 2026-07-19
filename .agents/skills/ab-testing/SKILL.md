---
name: ab-testing
description: When the user wants to plan, design, or implement an A/B test or experiment, or build a growth experimentation program. Also use when the user mentions "A/B test," "split test," "experiment," "test this change," "variant copy," "multivariate test," "hypothesis," "should I test this," "which version is better," "test two versions," "statistical significance," "how long should I run this test," "growth experiments," "experiment velocity," "experiment backlog," "ICE score," "experimentation program," or "experiment playbook." Use this whenever someone is comparing two approaches and wants to measure which performs better, or when they want to build a systematic experimentation practice. For tracking implementation, see analytics. For page-level conversion optimization, see cro.
metadata:
  version: 2.0.0
  source: https://github.com/coreyhaines31/marketingskills
---

# A/B Test Setup

You are an expert in experimentation and A/B testing. Your goal is to help design tests that produce statistically valid, actionable results.

## Initial Assessment

**Check for product marketing context first:**
If `.agents/product-marketing.md` exists, read it before asking questions.

Before designing a test, understand:

1. **Test Context** - What are you trying to improve? What change are you considering?
2. **Current State** - Baseline conversion rate? Current traffic volume?
3. **Constraints** - Technical complexity? Timeline? Tools available?

---

## Core Principles

### 1. Start with a Hypothesis
Not just "let's see what happens." Specific prediction of outcome based on reasoning or data.

### 2. Test One Thing
Single variable per test — otherwise you don't know what worked.

### 3. Statistical Rigor
Pre-determine sample size. Don't peek and stop early. Commit to the methodology.

### 4. Measure What Matters
Primary metric tied to business value, secondary metrics for context, guardrail metrics to prevent harm.

---

## Hypothesis Framework

```
Because [observation/data],
we believe [change]
will cause [expected outcome]
for [audience].
We'll know this is true when [metrics].
```

**Example:**
"Because users report difficulty finding the CTA (per heatmaps and feedback), we believe making the button larger and using contrasting color will increase CTA clicks by 15%+ for new visitors. We'll measure click-through rate from page view to signup start."

---

## Sample Size Quick Reference

| Baseline | 10% Lift | 20% Lift | 50% Lift |
|----------|----------|----------|----------|
| 1% | 150k/variant | 39k/variant | 6k/variant |
| 3% | 47k/variant | 12k/variant | 2k/variant |
| 5% | 27k/variant | 7k/variant | 1.2k/variant |
| 10% | 12k/variant | 3k/variant | 550/variant |

**Rule of thumb:** Run tests until you have enough data. Minimum 1-2 weeks even if sample size is reached (to account for day-of-week effects).

---

## Metrics Selection

### Primary Metric
- Single metric that matters most
- Directly tied to hypothesis
- What you'll use to call the test

### Secondary Metrics
- Support primary metric interpretation
- Explain why/how the change worked

### Guardrail Metrics
- Things that shouldn't get worse
- Stop test if significantly negative

---

## Traffic Allocation

| Approach | Split | When to Use |
|----------|-------|-------------|
| Standard | 50/50 | Default for A/B |
| Conservative | 90/10, 80/20 | Limit risk of bad variant |
| Ramping | Start small, increase | Technical risk mitigation |

---

## What to Test (Ranked by Impact)

### Highest Impact
- Value proposition / headline
- CTA copy and placement
- Pricing structure or price point
- Offer (free trial vs. freemium vs. demo)

### High Impact
- Social proof placement and format
- Page length and information order
- Form fields and friction
- Navigation and layout

### Medium Impact
- Button color (only meaningful if bad contrast existed)
- Images and visuals
- Testimonial format
- Supporting copy

---

## ICE Scoring for Test Prioritization

Rate each test idea:
- **Impact**: How much will this move the metric? (1-10)
- **Confidence**: How sure are we this will work? (1-10)
- **Ease**: How easy is this to implement? (1-10)

**ICE Score = (Impact + Confidence + Ease) / 3**

Run highest-ICE tests first.

---

## Test Documentation Template

```
Test Name: [Descriptive name]
Hypothesis: [Full hypothesis statement]
Primary Metric: [Metric + baseline]
Secondary Metrics: [List]
Guardrail Metrics: [List]
Traffic: [% allocated to each variant]
Sample Size Needed: [Per variant]
Expected Duration: [Days/weeks]
Start Date: [Date]
End Date: [Date]
Result: [Win/Loss/Inconclusive]
Key Learning: [What we learned]
Next Step: [Ship it / Iterate / Move on]
```
