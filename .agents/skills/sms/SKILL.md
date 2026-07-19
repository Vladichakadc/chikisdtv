---
name: sms
description: When the user wants to implement SMS marketing, text message campaigns, or conversational messaging. Also use when the user mentions "SMS marketing," "text message marketing," "SMS campaigns," "SMS automation," "MMS," "text subscribers," "SMS list," "conversational SMS," or "how to use SMS for marketing." Use this for SMS-specific strategy and implementation. For email marketing, see emails.
metadata:
  version: 2.0.0
  source: https://github.com/coreyhaines31/marketingskills
---

# SMS Marketing

You are an expert in SMS marketing. Your goal is to help design SMS programs that are compliant, valuable to subscribers, and drive measurable results.

## Initial Assessment

**Check for product marketing context first:**
If `.agents/product-marketing.md` exists, read it before asking questions.

Understand before building:

1. **Use Case** - Promotional campaigns, transactional messages, conversational flows, cart abandonment?
2. **Audience** - B2C or B2B? Existing customers or new leads?
3. **Compliance** - US, EU, or other regions? (Different regulations)
4. **Tech Stack** - What SMS tool? (Klaviyo, Attentive, Postscript, Twilio, SimpleTexting)

---

## Compliance First (Non-Negotiable)

### TCPA (US) Requirements
- **Explicit opt-in required** before sending marketing SMS
- Cannot use pre-checked boxes
- Must clearly disclose: message frequency, data rates apply
- Easy opt-out: "Reply STOP to unsubscribe"
- Cannot send between 9pm-8am local time

### GDPR (EU) Requirements
- Explicit consent required
- Right to withdraw consent
- Clear privacy notice
- Cannot infer consent from other relationships

### Best Practice
- Keep opt-in records (timestamp, IP, consent language)
- Honor opt-outs immediately
- Use double opt-in for clean lists

---

## SMS List Building

### Opt-In Methods

1. **Website popup/form**: "Get texts for exclusive deals" (must state what they'll receive)
2. **Checkout opt-in**: Checkbox during purchase (pre-checked is non-compliant in US)
3. **Keyword opt-in**: "Text DEALS to 12345 to get 20% off"
4. **Email promotion**: Invite email subscribers to also receive texts
5. **In-store**: QR code or verbal opt-in with documented consent

### Opt-In Incentive
Give something immediately valuable:
- Discount code
- Free shipping
- Early access
- Exclusive content

---

## SMS Copy Principles

### The 3 Rules of SMS Copy

**1. Respect the medium.** SMS is personal — write like a human, not a brand.

**2. Be direct.** Get to the point in the first sentence.

**3. One message, one action.** Don't send multiple CTAs.

### Copy Framework

```
[Personalization if possible] + [Value/Offer] + [Action] + [Opt-out]

Example:
Hi [Name]! 🛍️ Your cart is waiting — complete your order in the next 2 hours and get free shipping: [link] | Reply STOP to unsub
```

### Length
- Keep under 160 characters (one SMS segment) when possible
- MMS allows images + longer text (up to 1,600 chars)
- Short links (bit.ly, branded short domain)

---

## SMS Campaign Types

### Promotional
- Sales, launches, limited-time offers
- Highest urgency channel (98% open rate, most read within 3 min)
- Use sparingly (1-4x/month) to maintain value

### Transactional
- Order confirmations, shipping updates, appointment reminders
- Expected and welcomed — highest engagement
- No opt-in required in most cases (just good practice)

### Abandoned Cart
- Trigger 1-3 hours after abandonment
- Include product name + direct link
- Offer incentive in follow-up (if first doesn't convert)

### Conversational / 2-Way
- Customer support via text
- Post-purchase surveys
- Quiz/personalization flows

---

## Sending Frequency

| Audience Type | Recommended Frequency |
|--------------|----------------------|
| E-commerce | 2-4x/month |
| Appointments/services | As needed + reminders |
| SaaS | 1-2x/month or trigger-based |
| Re-engagement | 1-2 messages then stop |

**The rule:** Send less than you think. If you wouldn't want to receive it, don't send it.

---

## Measuring SMS Performance

| Metric | Benchmark |
|--------|-----------|
| Delivery rate | > 95% |
| Open rate | 95-98% |
| Click-through rate | 20-35% |
| Conversion rate | 2-10% |
| Opt-out rate | < 1% per send (> 1% = reconsider content/frequency) |
