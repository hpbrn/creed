export type FaqItem = {
  question: string;
  answer: string;
};

export const homeFaqItems: FaqItem[] = [
  {
    question: "What actually goes in a Creed?",
    answer:
      "Who you are, what you're working toward, how you like AI to talk to you, the people and routines that shape your week, plus any health, accessibility, or hard noes AI should respect. One concise profile, not a journal.",
  },
  {
    question: "Why not just retell every AI who I am each time?",
    answer:
      "Because it doesn't stick, doesn't cross tools, and you end up repeating yourself. Creed gives every AI the same profile to read before answering, and lets them propose updates as they learn more about you.",
  },
  {
    question: "Which tools does Creed work with?",
    answer:
      "Creed connects to compatible agents through local MCP while the Mac app is running. Your profile stays in a Markdown file you can edit with other tools.",
  },
  {
    question: "What gets written back to Creed?",
    answer:
      "Durable things AI learns about you, a sharper preference, a new routine, a goal that shifted. Not session recap, not mood, not generic praise.",
  },
  {
    question: "Do I have to review every change?",
    answer:
      "No. You can keep agent edits reviewable, or trust them to write directly when you want a lighter loop. The point is control when you want it, not friction by default.",
  },
  {
    question: "Is Creed for teams or just for me?",
    answer:
      "Creed is a personal desktop app. You choose the Markdown files to open and the permissions for each section.",
  },
];
