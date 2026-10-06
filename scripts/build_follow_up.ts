import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { FollowUpEntry } from '../src/components/FollowUpEntry';
import { ScriptProvider, translateStaticText, type Script } from '../src/lib/script';

declare const Bun: {
  file(path: string): { text(): Promise<string> };
  markdown: { html(markdown: string, options?: { headings?: { ids: boolean } }): string };
};

// Only public, maintained content is rendered here. No applicant data or email
// access enters the build, and the generated page does not fetch case data.
const root = process.cwd();
const source = resolve(root, 'content/follow-up');
const destination = resolve(root, 'public/pracenje');
const read = (name: string) => readFile(resolve(source, name), 'utf8');
const copyPublicFile = (from: string, to: string) => readFile(from).then((content) => writeFile(to, content));
const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]!);

interface Template {
  id: string;
  title: string;
  recipient: string;
  use_when: string;
  body: string;
  formal: boolean;
  subject: string;
  attachments: string[];
}
interface WorkflowNode {
  id: string;
  type: string;
  next?: string;
  edges?: Record<string, string>;
  templates?: string[];
  resume_on?: { event: string; next: string }[];
}
interface Source {
  id: string;
  title: string;
  url: string;
  scope: string;
  classification: string;
}

const [agent, human, templateText, workflowText, sourceText, css] = await Promise.all([
  read('agent.md'), read('human.md'), read('templates.json'), read('workflow.json'),
  read('sources.json'), Bun.file(resolve(root, 'src/styles.css')).text(),
]);
const templates: Template[] = JSON.parse(templateText);
const workflow: { version: string; start: string; nodes: WorkflowNode[] } = JSON.parse(workflowText);
const catalogue: { version: string; catalogue_review_date: string; sources: Source[] } = JSON.parse(sourceText);
const ids = new Set(workflow.nodes.map((node) => node.id));
const templateIds = new Set(templates.map((template) => template.id));
if (ids.size !== workflow.nodes.length || templateIds.size !== templates.length || !ids.has(workflow.start)) {
  throw new Error('Follow-up workflow/template IDs must be unique and start must exist.');
}
if (catalogue.version !== workflow.version) throw new Error('Follow-up resource versions disagree.');
for (const node of workflow.nodes) {
  const targets = [node.next, ...Object.values(node.edges ?? {}), ...(node.resume_on ?? []).map((edge) => edge.next)];
  for (const target of targets) {
    if (target && !ids.has(target)) throw new Error(`${node.id}: missing workflow target ${target}`);
  }
  for (const template of node.templates ?? []) {
    if (!templateIds.has(template)) throw new Error(`${node.id}: missing template ${template}`);
  }
}
for (const template of templates) {
  if (!/^T\d{2}$/.test(template.id) || !template.body || !template.subject || !Array.isArray(template.attachments)) {
    throw new Error(`Incomplete follow-up template ${template.id}`);
  }
}
for (const entry of catalogue.sources) {
  if (new URL(entry.url).protocol !== 'https:') throw new Error(`Non-HTTPS source ${entry.id}`);
}

// The original packet is Cyrillic. Convert only maintained guide/template copy;
// URLs, provider names and the exact public starter prompts remain unchanged.
const LATIN_BY_CYRILLIC: Record<string, string> = {
  А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Ђ: 'Đ', Е: 'E', Ж: 'Ž', З: 'Z', И: 'I', Ј: 'J',
  К: 'K', Л: 'L', Љ: 'Lj', М: 'M', Н: 'N', Њ: 'Nj', О: 'O', П: 'P', Р: 'R', С: 'S', Т: 'T',
  Ћ: 'Ć', У: 'U', Ф: 'F', Х: 'H', Ц: 'C', Ч: 'Č', Џ: 'Dž', Ш: 'Š',
};
const toLatin = (text: string) => text.replace(/[А-Яа-яЂђЈјЉљЊњЋћЏџ]/g, (char, offset) => {
  const upper = LATIN_BY_CYRILLIC[char.toUpperCase()];
  if (!upper) return char;
  const replacement = char === char.toUpperCase() ? upper : upper.toLowerCase();
  // Serbian digraphs preserve ordinary mixed-case spelling (Љуб → Ljub).
  const next = text[offset + 1] ?? '';
  return char === char.toUpperCase() && /[А-ЯЂЈЉЊЋЏ]/.test(next) ? upper.toUpperCase() : replacement;
});

const additionalCss = `
.follow-up-document .prose { overflow-wrap: anywhere; }
.follow-up-document .prose p, .follow-up-document .prose ul, .follow-up-document .prose ol { margin: .9rem 0; }
.follow-up-document .prose ul, .follow-up-document .prose ol { padding-left: 1.5rem; }
.follow-up-document .prose h2 { margin: 1.75rem 0 .65rem; color: var(--color-primary); }
.follow-up-document .prose h3 { margin: 1.25rem 0 .5rem; }
.follow-up-document a { overflow-wrap: anywhere; }
.follow-up-document nav { display:flex; flex-wrap:wrap; gap:.8rem; margin:1rem 0; }
.follow-up-document .template { margin:1rem 0; padding:1rem; border:1px solid var(--color-border); border-radius:var(--radius-md); }
.follow-up-document .manual-step { border-top:1px solid #cbd5e1; }
.follow-up-document .manual-step summary { padding:.85rem 0; }
.follow-up-document .prose > h2:first-child { margin-top:0; }
.follow-up-document summary { cursor:pointer; font-weight:700; }
.follow-up-document pre { white-space:pre-wrap; overflow-wrap:anywhere; font:inherit; padding:1rem; background:var(--color-bg); margin:1rem 0; }
.follow-up-document .source { margin:1rem 0; }
.follow-up-document :target { scroll-margin-top:1rem; }
.follow-up-document .skip-link { position:absolute; left:-10000px; }
.follow-up-document .skip-link:focus { position:static; }
@media print { .follow-up-document nav, .follow-up-document button, .follow-up-document [data-follow-up-provider] { display:none; } .follow-up-document details::details-content { display:block; } .follow-up-document .card { box-shadow:none; } }
`;

function enhancement(): string {
  return `document.addEventListener('click', async (event) => {
    const control = event.target.closest('[data-follow-up-copy], [data-follow-up-provider]');
    if (!control) return;
    const root = control.closest('[data-follow-up-entry]');
    const feedback = root?.querySelector('[data-follow-up-feedback]');
    const copied = root?.dataset.copySuccess ?? 'Tekst je kopiran.';
    const failed = root?.dataset.copyFailure ?? 'Kopiranje nije uspelo. Označite tekst i kopirajte ga ručno.';
    if (control.hasAttribute('data-follow-up-provider') && feedback) {
      feedback.textContent = root.dataset.launchPending ?? '';
    }
    let didCopy = false;
    try {
      await navigator.clipboard.writeText(control.dataset.copyValue);
      didCopy = true;
    } catch {
      const previousFocus = document.activeElement;
      const textArea = document.createElement('textarea');
      textArea.value = control.dataset.copyValue;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try { didCopy = document.execCommand('copy'); } catch { didCopy = false; }
      textArea.remove();
      if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
    }
    if (feedback) feedback.textContent = didCopy
      ? control.hasAttribute('data-follow-up-provider') ? root.dataset.launchSuccess ?? copied : copied
      : control.hasAttribute('data-follow-up-provider') ? root.dataset.launchFailure ?? failed : failed;
  });
  function revealTarget() {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if(target?.tagName === 'DETAILS') target.open = true;
  }
  addEventListener('hashchange', revealTarget); revealTarget();
  const openBeforePrint = new Map();
  addEventListener('beforeprint', () => document.querySelectorAll('details').forEach(el => { openBeforePrint.set(el,el.open); el.open=true; }));
  addEventListener('afterprint', () => { openBeforePrint.forEach((open,el) => {el.open=open;}); openBeforePrint.clear(); });`;
}

function renderPage(script: Script) {
  const t = (text: string) => translateStaticText(script, text);
  const copy = (text: string) => script === 'latin' ? toLatin(text) : text;
  const statusUrl = script === 'latin' ? '/status?script=latin' : '/status';
  const manual = script === 'latin' ? toLatin(human.replaceAll('](/status)', `](${statusUrl})`)) : human;
  const manualSections = manual.split(/^## /m);
  const manualOverview = manualSections[0].replace(/^# .*\n/u, '');
  const manualSteps = manualSections.slice(1).map((section, index) => {
    const headingEnd = section.indexOf('\n');
    const title = section.slice(0, headingEnd);
    const body = section.slice(headingEnd + 1);
    return `<details class="manual-step" id="manual-step-${index + 1}">
      <summary>${escape(title)}</summary>${Bun.markdown.html(body)}
    </details>`;
  }).join('\n');
  const entry = renderToStaticMarkup(React.createElement(ScriptProvider, { initialScript: script },
    React.createElement(FollowUpEntry, { standalone: true })));
  const templateHtml = templates.map((item) => {
    const completeText = [
      `${t('Primalac:')} ${copy(item.recipient)}`,
      `${t('Predmet:')} ${copy(item.subject)}`,
      `${t('Prilozi za ručno dodavanje:')} ${copy(item.attachments.join('; '))}`,
      '',
      copy(item.body),
    ].join('\n');
    return `<details class="template" id="${item.id}" data-follow-up-entry data-copy-success="${escape(t('Obrazac je kopiran.'))}" data-copy-failure="${escape(t('Kopiranje nije uspelo. Označite tekst i kopirajte ga ručno.'))}">
      <summary>${item.id} — ${escape(copy(item.title))}</summary>
      <p><strong>${t('Kada koristiti:')}</strong> ${escape(copy(item.use_when))}</p>
      <p><strong>${t('Primalac:')}</strong> ${escape(copy(item.recipient))}</p>
      <p><strong>${t('Predmet:')}</strong> ${escape(copy(item.subject))}</p>
      <p><strong>${t('Prilozi koje treba ručno priložiti:')}</strong> ${escape(copy(item.attachments.join('; ')))}</p>
      ${item.formal ? `<p class="alert alert-warning">${t('Uslovni formalni nacrt: ne šaljite pre provere pravnog sredstva, roka i važećeg kanala predaje.')}</p>` : ''}
      <pre>${escape(copy(item.body))}</pre>
      <button type="button" class="btn btn-secondary" data-follow-up-copy="template" data-copy-value="${escape(completeText)}">${t('Kopiraj kompletan obrazac')}</button>
      <p role="status" aria-live="polite" data-follow-up-feedback></p>
    </details>`;
  }).join('\n');
  const sourceHtml = catalogue.sources.map((item) => `<li class="source" id="source-${escape(item.id)}">
    <a href="${escape(item.url)}" target="_blank" rel="noopener noreferrer">${escape(item.title)}</a>
    <p>${escape(item.scope)}</p><small>${escape(item.classification)}</small>
  </li>`).join('\n');
  return `<!doctype html>
<html lang="${script === 'latin' ? 'sr-Latn' : 'sr-Cyrl'}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>${t('Praćenje prijave za glasanje iz inostranstva | Korak do glasa')}</title>
<meta name="description" content="${t('Praktični koraci, obrasci i uputstvo za vašeg asistenta kada nema odgovora na već poslatu prijavu za glasanje iz inostranstva.')}">
<link rel="canonical" href="https://korakdoglasa.org/pracenje/${script === 'latin' ? 'latin/' : ''}">
<link rel="alternate" hreflang="sr-Cyrl" href="https://korakdoglasa.org/pracenje/">
<link rel="alternate" hreflang="sr-Latn" href="https://korakdoglasa.org/pracenje/latin/">
<link rel="icon" href="/favicon.ico"><style>${css}\n${additionalCss}</style>
</head><body class="follow-up-document"><div class="container">
<a class="skip-link" href="#manual">${t('Pređi na ručne korake')}</a>
<header class="header"><a href="/${script === 'latin' ? '?script=latin' : ''}"><img class="header-logo" src="/assets/rotunda-serbica-envelope.webp" alt="${t('Korak do glasa')}"></a>
<h1 class="header-title">${t('Praćenje prijave')}</h1>
<p>${t('Nezavisan vodič — nije usluga državnog organa.')}</p>
<nav aria-label="${t('Pismo i navigacija')}"><a href="/pracenje/" lang="sr-Cyrl" ${script === 'cyrillic' ? 'aria-current="page"' : ''}>Ћирилица</a><a href="/pracenje/latin/" lang="sr-Latn" ${script === 'latin' ? 'aria-current="page"' : ''}>Latinica</a><a href="${statusUrl}">${t('Kontakti predstavništava')}</a></nav></header>
<main>${entry}
<nav aria-label="${t('Sadržaj vodiča')}"><a href="#manual">${t('Ručni koraci')}</a><a href="#templates">${t('Obrasci poruka')}</a><a href="#sources">${t('Zvanični izvori')}</a><a href="/pracenje/agent.md">${t('Uputstvo za asistenta')}</a></nav>
<section id="manual" class="card prose"><h2>${t('Ručni koraci')}</h2>${manualSteps}
<details class="manual-step"><summary>${t('O vodiču i ograničenjima')}</summary>${Bun.markdown.html(manualOverview)}</details></section>
<section id="templates" class="card prose"><h2>${t('Obrasci za postojeću prijavu')}</h2>
<p>${t('Izaberite samo obrazac koji odgovara činjenicama. Popunite označena polja privatno, uklonite neprimenljive varijante i proverite primaoca i priloge. Formalni obrasci su uslovni: ne šaljite ih bez provere pravnog sredstva, roka i važećeg kanala predaje.')}</p>
<p><a href="/pracenje/${script === 'latin' ? 'latin/' : ''}templates.md">${t('Svi obrasci u tekstualnom obliku')}</a></p>${templateHtml}</section>
<details id="sources" class="card prose"><summary>${t('Zvanični izvori i njihov opseg')}</summary>
<p>${t('Izvori sadrže i istorijske materijale i primere. Otvaranje stranice ne potvrđuje važenje propisa. Pre postupanja proverite aktuelne kontakte, konkretne izbore i nadležnost. Beleške o opsegu iz izvornog kataloga zadržane su na engleskom.')}</p>
<p>${t('Verzija postupka:')} ${escape(workflow.version)}. ${t('Referentni datum kataloga:')} ${escape(catalogue.catalogue_review_date)}. ${t('Ovo nije datum pravne potvrde svih izvora.')}</p>
<ul>${sourceHtml}</ul></details>
</main><footer class="prose"><p>${t('Sajt ne prima niti šalje vašu prijavu i ne čuva predmet. Ako prepisku podelite sa spoljnim asistentom, važe pravila privatnosti tog pružaoca usluge. Ne unosite identifikacione podatke u javne linkove.')}</p>
<p><a href="https://github.com/vokativ/glasanje/issues" target="_blank" rel="noopener noreferrer">${t('Prijavite grešku bez ličnih podataka')}</a></p></footer>
</div><script>${enhancement()}</script></body></html>`;
}

function templateMarkdown(script: Script) {
  const t = (text: string) => translateStaticText(script, text);
  const copy = (text: string) => script === 'latin' ? toLatin(text) : text;
  const lines = templates.map((item) => [
    `## ${item.id} — ${copy(item.title)}`,
    '',
    `${t('Kada koristiti:')} ${copy(item.use_when)}`,
    '',
    `${t('Primalac:')} ${copy(item.recipient)}`,
    '',
    `${t('Predmet:')} ${copy(item.subject)}`,
    '',
    `${t('Prilozi za ručno dodavanje:')} ${copy(item.attachments.join('; '))}`,
    '',
    item.formal ? t('Uslovni formalni nacrt: proverite pravno sredstvo, rok i kanal.') : '',
    '',
    '```text',
    copy(item.body),
    '```',
    '',
  ].join('\n'));
  return `# ${t('Obrasci za praćenje postojeće prijave')}\n\n${t('Proverite primaoca, nadležnost, činjenice i uslove predaje. Popunite polja privatno; ne šaljite nepopunjene ili neprimenljive varijante. Formalni nacrti nisu automatski važeći podnesci.')}\n\n${lines.join('\n')}`;
}

await mkdir(resolve(destination, 'latin'), { recursive: true });
for (const script of ['cyrillic', 'latin'] as const) {
  const html = renderPage(script);
  const anchors = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  const fragments = [...html.matchAll(/href="#([^"]+)"/g)].map((match) => decodeURIComponent(match[1]));
  for (const fragment of fragments) {
    if (!anchors.has(fragment)) throw new Error(`${script}: missing manual anchor #${fragment}`);
  }
  const folder = script === 'latin' ? resolve(destination, 'latin') : destination;
  await writeFile(resolve(folder, 'index.html'), html);
  await writeFile(resolve(folder, 'templates.md'), templateMarkdown(script));
}
await writeFile(resolve(destination, 'agent.md'), agent);
for (const name of ['workflow.json', 'sources.json', 'case.schema.json', 'election-profile.example.json']) {
  await copyPublicFile(resolve(source, name), resolve(destination, name));
}
await copyPublicFile(resolve(source, 'templates.json'), resolve(destination, 'templates.json'));
console.log(`Follow-up resources generated: ${workflow.nodes.length} workflow nodes, ${templates.length} templates, Cyrillic and Latin HTML.`);
