import type { LegalDoc, LegalDocId } from "./types";

// DRAFT. A lawyer reviews these texts before payments launch (see “Legal” in the business plan).

export const LEGAL_EN: Record<LegalDocId, LegalDoc> = {
  terms: {
    title: "Terms of use",
    intro: "These terms govern your use of Entry Check ({site}) and the purchase of a Trip Pack. By using the site, you agree to them.",
    sections: [
      {
        heading: "What Entry Check is",
        paragraphs: [
          "Entry Check is an independent reference service. We show the entry requirements for your route and link to official government websites.",
          "We are not a government authority, and we do not file applications, forms or declarations on your behalf. We do not collect passport numbers.",
          "Seller: {seller}. Contact: {email}.",
        ],
      },
      {
        heading: "Reference information",
        paragraphs: [
          "Information on this site is for reference only and is not legal advice.",
          "We take rules from official sources only and show the verification date on every card. Governments can change requirements without notice, so check the official website we link to before you travel.",
          "The final decision on boarding and entry is made by the carrier and border authorities.",
        ],
      },
      {
        heading: "Trip Pack",
        paragraphs: [
          "Trip Pack is a paid digital service for one trip: a PDF checklist, email reminders when filing windows open, a re-check of your route 72 hours before your first departure, and an email if the rules for your route change after purchase.",
          "The price is shown on the site before payment. Government fees are not included: you pay them directly on official websites.",
          "Payments are processed by a payment provider. We never receive your card details.",
        ],
      },
      {
        heading: "Immediate performance",
        paragraphs: [
          "By paying for a Trip Pack, you ask us to start providing the service immediately and acknowledge that, once performance has begun, any statutory 14-day right of withdrawal ends. This does not affect our refund guarantee.",
        ],
      },
      {
        heading: "Guarantee and refunds",
        paragraphs: [
          "If we missed a required document for your route or linked to a site that is not official, we refund you the same day. See the refund policy for details.",
        ],
      },
      {
        heading: "Limitation of liability",
        paragraphs: [
          "To the extent permitted by law, our liability for any claim related to a Trip Pack is limited to the amount you paid for it.",
          "We are not responsible for decisions of government authorities or carriers, for the operation of official websites, or for consequences of not checking the official source.",
        ],
      },
      {
        heading: "Personal data",
        paragraphs: ["How we handle data is described in our privacy policy."],
      },
      {
        heading: "Changes to these terms",
        paragraphs: [
          "We may update these terms. A new version takes effect when published on the site. A Trip Pack already paid for is governed by the version in force on the payment date.",
        ],
      },
    ],
  },

  privacy: {
    title: "Privacy policy",
    intro: "We collect only the minimum data the service needs to work.",
    sections: [
      {
        heading: "What data we process",
        paragraphs: [
          "Citizenship, route countries, and arrival dates and times — when you run a check. They live in the link to your result and are processed in your browser; if you don’t buy anything, we don’t store them.",
          "Your email address — if you buy a Trip Pack or ask to be notified when Traveler Pass launches.",
          "Payment details: status and amount. Card details are handled by the payment provider and never reach us.",
          "Anonymous visit statistics — without cookies and without identifying you.",
          "We do not collect passport numbers, photos or copies of documents.",
        ],
      },
      {
        heading: "Why",
        paragraphs: [
          "To show your check result; to send the checklist, reminders and rule-change emails for a paid trip; to take payments and issue refunds; to understand which parts of the site are useful.",
        ],
      },
      {
        heading: "Who we share data with",
        paragraphs: [
          "Only with processors the service cannot run without: hosting and database (Cloudflare), email delivery (Resend), payments (RollyPay). They process data on our instructions.",
          "We do not sell data or share it with advertising networks.",
        ],
      },
      {
        heading: "How long we keep it",
        paragraphs: [
          "Order data and email — while the Trip Pack is active and for 12 months after for support and payment records, unless the law requires longer.",
          "Waitlist addresses — until the launch email or until you ask us to delete them.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "You can request a copy of your data, correct it or have it deleted — email {email}. We reply within 30 days.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: ["Data controller: {seller}. Email: {email}."],
      },
    ],
  },

  refunds: {
    title: "Refund policy",
    sections: [
      {
        heading: "Guarantee",
        paragraphs: [
          "If we missed a required document for your route — a visa, a travel authorisation (ETA) or a mandatory arrival card — or linked to a site that is not official, we refund the full Trip Pack price.",
        ],
      },
      {
        heading: "How to get a refund",
        paragraphs: [
          "Reply to any of our emails or write to {email} and tell us what went wrong. That’s the whole process: no forms to fill in.",
          "We issue the refund the same day if you contact us during working hours, otherwise on the next working day.",
        ],
      },
      {
        heading: "When the money arrives",
        paragraphs: [
          "Refunds go back to the original payment method. Timing depends on your bank: usually up to 5 working days.",
        ],
      },
      {
        heading: "Other cases",
        paragraphs: [
          "Changed your mind? Write to us and we’ll look at your case.",
          "Government fees paid on official websites are refunded by the authorities under their own rules.",
        ],
      },
    ],
  },
};
