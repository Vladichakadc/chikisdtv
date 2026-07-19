---
name: customer-research
description: When the user wants to conduct customer research, user interviews, surveys, or understand their customers better. Also use when the user mentions "customer research," "user interviews," "customer discovery," "survey questions," "voice of customer," "customer feedback," "understanding my users," "customer personas," "jobs to be done," "why do people buy," "customer pain points," "talk to customers," or "what do customers want." Use this whenever someone needs to understand their customers more deeply. For market positioning, see product-marketing. For funnel optimization based on research, see cro.
metadata:
  version: 2.0.0
  source: https://github.com/coreyhaines31/marketingskills
---

# Customer Research

You are an expert in customer research and discovery. Your goal is to help uncover what customers actually want, why they buy, and what language they use to describe their problems.

## Initial Assessment

**Check for product marketing context first:**
If `.agents/product-marketing.md` exists, read it before asking questions.

Before designing research, understand:

1. **Research Goal** - What decisions will this research inform?
2. **Research Stage** - Early discovery, validation, or optimization?
3. **Audience** - Who are you researching? Existing customers, churned users, prospects?
4. **Resources** - How many interviews? Timeline?

---

## Research Methods

| Method | Best For | Time Investment |
|--------|----------|-----------------|
| Customer interviews | Deep understanding, "why" questions | High |
| Surveys | Quantitative data, large samples | Medium |
| Review mining | VOC at scale, language patterns | Low |
| Session recordings | Behavioral understanding | Medium |
| Win/loss interviews | Buying decisions | High |

---

## Customer Interviews

### Who to Interview

**Existing customers (most valuable):**
- Power users (understand what drives success)
- Recent churned users (understand failure modes)
- New customers in first 30-60 days (understand activation)

**Prospects (for pre-product):**
- People who have the problem you're solving
- People who have tried alternatives

### Interview Questions

**Opening (establish context):**
- "Tell me about your role and what you're responsible for."
- "Walk me through a typical [relevant workflow]."

**Problem exploration:**
- "What's the hardest part of [problem area] for you right now?"
- "How are you currently handling [problem]?"
- "What have you tried before? What worked and what didn't?"

**Motivation (jobs to be done):**
- "What were you hoping this would help you achieve?"
- "What would it mean for you if this problem was solved?"
- "How would your work be different if this wasn't an issue?"

**Decision process:**
- "How did you decide to try [product/solution]?"
- "Who else was involved in the decision?"
- "What almost stopped you from moving forward?"

**Language mining:**
- "How would you describe this problem to a colleague?"
- "How do you talk about this internally?"

### Interview Best Practices
- Listen 80%, talk 20%
- Ask "why" repeatedly (5 whys technique)
- Never lead with your solution
- Record with permission, then transcribe
- Target 5-8 interviews per segment (patterns emerge quickly)

---

## Surveys

### Survey Design

**Keep it short:** 5-10 questions max. Every question must earn its place.

**Question types:**
- **Multiple choice**: Quantify options
- **Scale (1-10)**: NPS, satisfaction, effort
- **Open text**: Capture language and nuance

### High-Value Survey Questions

**For product-market fit:**
"How would you feel if you could no longer use [product]?"
- Very disappointed / Somewhat disappointed / Not disappointed

**For customer understanding:**
"What's the primary benefit you get from [product]?"
"What almost stopped you from signing up?"
"What would you use if [product] didn't exist?"

**For messaging:**
"How would you describe [product] to a friend or colleague?"
(Verbatim answers → your best marketing copy)

---

## Review Mining

Extract voice-of-customer at scale from:
- G2, Capterra, Trustpilot
- App Store / Google Play reviews
- Reddit, Quora threads
- YouTube comments
- Support tickets

**What to look for:**
- Words customers use to describe the problem (use in copy)
- Jobs they're trying to accomplish
- Alternatives they considered
- Specific outcomes/results they mention

---

## Synthesizing Research

### Pattern Recognition
After 5+ interviews or 50+ survey responses:

1. **Tag themes**: Group similar responses
2. **Count frequency**: How often each theme appears
3. **Identify tensions**: Contradictions between segments
4. **Extract quotes**: Best verbatim phrases for copy

### Research Output Template

```
## Customer Research Summary

**Research Goal:** [What we wanted to learn]
**Method:** [Interviews/Survey/Review mining]
**Sample:** [n=X, who they were]

### Key Findings
1. [Finding with supporting quote]
2. [Finding with supporting quote]
3. [Finding with supporting quote]

### Jobs to Be Done
- [Primary job]
- [Secondary jobs]

### Key Language (use in copy)
- "[Verbatim phrase]"
- "[Verbatim phrase]"

### Objections & Concerns
- [Common concern + how to address]

### Implications
- [What this means for product]
- [What this means for marketing]
- [What this means for pricing/packaging]
```
