/** Public handoff text only: never include an applicant's case or form values. */
export const FOLLOW_UP_AGENT_URL = 'https://korakdoglasa.org/pracenje/agent.md';

export const FOLLOW_UP_SHORT_PROMPT = `Отвори ${FOLLOW_UP_AGENT_URL}`;

export const FOLLOW_UP_DETAILED_PROMPT = `${FOLLOW_UP_SHORT_PROMPT} и примени упутство да ми помогнеш да проверим шта се догодило са мојом већ послатом пријавом за гласање из иностранства. Немој само да сажмеш страницу — започни поступак и уради кораке за које имаш алате и моје одобрење. Ако имаш приступ мом мејлу, прво затражи моју дозволу да претражиш само преписку о овој пријави; отварање упутства није дозвола за приступ мејлу. Питај ме само за податке који недостају, провери званичне изворе и контакте и припреми одговарајуће поруке и следеће кораке. Пре слања било чега прикажи примаоце, текст и прилоге и затражи моје изричито одобрење.`;

// These ordinary-chat query conventions are best effort: providers may ignore
// them or require sign-in, so the visible copy/paste path remains authoritative.
const encodedDetailedPrompt = encodeURIComponent(FOLLOW_UP_DETAILED_PROMPT);

export const FOLLOW_UP_ASSISTANTS = [
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    url: `https://chatgpt.com/?q=${encodedDetailedPrompt}`,
  },
  {
    id: 'gemini',
    label: 'Gemini',
    url: 'https://gemini.google.com/app',
  },
  {
    id: 'claude',
    label: 'Claude',
    url: `https://claude.ai/new?q=${encodedDetailedPrompt}`,
  },
] as const;
