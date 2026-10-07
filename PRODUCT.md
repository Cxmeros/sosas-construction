# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Danilo Sosa, a flooring contractor in Lansdowne, PA, is the only person who fills in documents. He
works from his phone on the job site (often outdoors, in sunlight) and from a computer at home.
He thinks and reads in Spanish; his customers receive documents in English.

## Product Purpose

Replace the Word file Danilo edits by hand for every Work Estimate and Invoice. He fills in a form
and gets a Letter-size PDF that is ready to send to the customer from the same device. Success means
he never opens Word again: a document takes minutes, the format never shifts, and nothing has to be
erased by hand.

## Positioning

A private, single-contractor tool rather than invoicing software. It has no accounts, no backend
and no history: the PDF is the record. Everything runs on the device, so customer data leaves it
only inside the PDF Danilo chooses to share.

## Operating Context

- Built around his real workflow: an estimate first, then "Convertir en Invoice" keeps the customer
  and line items.
- Sends the PDF via WhatsApp, Messages or email (Web Share API), with download as the fallback.
- Typical jobs: hardwood install and refinish, carpet removal, steps and handrails, priced per
  sq ft, linear ft, step, each, hour or lump sum.
- Deposits are usually 20 % or 30 % on estimates; invoices show the deposit received and the balance due.
- Installable PWA that works offline after the first load. It is meant to be deployed on Cloudflare
  Pages behind Cloudflare Access, so only Danilo's email can open it (`docs/DEPLOY.md`).

## Capabilities and Constraints

- The scope, calculations and PDF rules are defined in `SPEC.md`, and the engineering rules in
  `CLAUDE.md`. Both are binding: client-side only, no third-party runtime code, money in integer
  cents, Zod at the form → model edge.
- Interface language: Spanish, plain and without jargon. PDF language: English.
- No tax line, no payment methods printed, no document history (all confirmed by the client).
- Phase 2, not built: a catalog of frequent services with default prices, and editable company details.
- Status: not yet used on real jobs. Milestone M6 (testing on Danilo's phone with 2–3 real
  jobs) is pending.

## Brand Commitments

- Business name "Sosa's Constructions"; the company block prints DANILO SOSA, the address and two
  phone numbers from `src/config/company.ts`.
- Logo: `src/assets/logo-placeholder.png` (extracted from his old PDF, white background, never placed
  on colored backgrounds). **Open decision:** it is unknown whether a final, higher-quality logo will
  replace it. Keep it swappable in one place.

## Evidence on Hand

- One real estimate is the reference case: `design/project/uploads/ESTIMADO SOSAS.docx.pdf`. Its numbers are the
  required test cases in SPEC §6 (total $18,356.75).
- Claude Design handoff: `design/` (brief, chat, app and PDF prototypes).
- There are no other job examples, no testimonials and no customer list. Do not fabricate them.

## Product Principles

1. Faster than the Word file, or it fails: every screen serves "fill in → PDF → send".
2. The PDF is the product. What the preview shows must be exactly what the customer receives.
3. Nothing leaves the device unless Danilo shares it.
4. Built for the field: one-handed phone use, sunlight, interruptions. The draft must survive
   closing the app.
5. Plain Spanish over clever wording, and money is never ambiguous.

## Accessibility & Inclusion

- Touch targets ≥ 48 px, AA contrast or better for outdoor use, visible keyboard focus.
- Errors shown next to each field, in Spanish.
- Must work equally well at 375 px (phone) and 1280 px (computer).
