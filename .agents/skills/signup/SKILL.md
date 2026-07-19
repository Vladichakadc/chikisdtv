---
name: signup
description: When the user wants to optimize their signup flow, registration process, or account creation experience. Also use when the user mentions "signup optimization," "registration flow," "signup form," "sign up conversion," "reduce signup friction," "improve signup rate," "trial signup," "account creation," "too many dropoffs at signup," or "users aren't completing signup." Use this for the signup/registration step specifically. For what happens after signup, see onboarding. For the page leading to signup, see cro.
metadata:
  version: 2.0.0
  source: https://github.com/coreyhaines31/marketingskills
---

# Signup Flow Optimization

You are an expert in signup and registration flow optimization. Your goal is to reduce friction in the signup process and increase the percentage of visitors who complete account creation.

## Initial Assessment

**Check for product marketing context first:**
If `.agents/product-marketing.md` exists, read it before asking questions.

Before providing recommendations, understand:

1. **Current Signup Flow** - What fields are collected? How many steps?
2. **Signup Rates** - Current conversion rate from visit to signup?
3. **Drop-off Points** - Where do people abandon?
4. **Product Type** - SaaS, marketplace, app, e-commerce?

---

## Core Principle: Every Field Is a Reason Not to Sign Up

Each form field adds friction. Each step adds drop-off.

**The rule:** Only collect what you absolutely need to deliver immediate value.

---

## Signup Flow Architecture

### Option 1: Single-Step (Recommended for SaaS)
- Email (and maybe password)
- Optionally: Name
- CTA → Into product

**Best for:** Products that can immediately show value without personalization.

### Option 2: Multi-Step (Wizard)
- Step 1: Email + password
- Step 2: Profile / company info
- Step 3: Use case / personalization

**Best for:** Products that need personalization to deliver value.
**Key:** Show progress. Let people skip optional steps. Never go back to collect skipped info at signup.

### Option 3: Social Auth First
- "Sign in with Google / GitHub / Slack"
- No password friction
- Collect additional info after

**Best for:** Developer tools, B2C apps, products where SSO is expected.

---

## Friction Reduction Checklist

### Form Design
- [ ] Minimum required fields (name + email is often too much; just email to start)
- [ ] Password requirements visible, not surprising after submit
- [ ] Auto-advance to next field
- [ ] Real-time validation (not only at submission)
- [ ] Mobile-optimized inputs (correct keyboard type for email, etc.)

### Page Design
- [ ] No navigation links that could distract from completing signup
- [ ] Social proof near the signup form (logos, user count)
- [ ] Clear security/privacy signal (SSL, "We won't spam you")
- [ ] Benefits of signing up visible above the fold

### Error Handling
- [ ] Clear, helpful error messages ("Email already in use — sign in instead?")
- [ ] Don't clear form fields on error
- [ ] Don't require users to retype password if email is already taken

### Email Confirmation
- [ ] Consider skipping email confirmation if possible (adds drop-off)
- [ ] If required: immediate, clear email with prominent CTA
- [ ] Magic link option instead of password (reduces friction)
- [ ] Allow access immediately, verify in background

---

## Signup Copy

### Headline (on signup page)
- Match the CTA they clicked to get here
- Restate the value, not the process
- "Start your free trial" not "Create your account"

### Form Labels & Placeholders
- Labels > placeholders (placeholders disappear when typing)
- "Work email" > "Email" (sets expectation for B2B products)
- "Full name" if name is needed

### CTA Button
- First-person: "Start my free trial" > "Start free trial"
- Specific: "Create my account" > "Submit"
- No obligation: "Try free — no credit card required"

### Secondary Message Below CTA
- "No credit card required"
- "Setup takes 2 minutes"
- "Cancel anytime"
- Pick the one that addresses the main objection

---

## Signup A/B Tests to Run

**High impact:**
1. Add "Sign in with Google" (typically lifts signup 20-40%)
2. Remove one form field (measure completion rate)
3. Change CTA copy (first-person vs. second-person)
4. Add/remove password requirement at signup

**Medium impact:**
5. Social proof placement (above vs. below form)
6. Security badge near form
7. Single-step vs. multi-step
8. Progress indicator for multi-step flows

---

## Measuring Signup Health

| Metric | Definition | Benchmark |
|--------|------------|-----------|
| Visitor → Signup rate | % of page visitors who start signup | 2-10% |
| Signup completion rate | % who finish signup after starting | 60-80% |
| Time to complete | How long signup takes | < 2 minutes |
| Signup source | Which channel drives highest-quality signups | Track by channel |
