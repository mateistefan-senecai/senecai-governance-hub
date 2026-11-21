// Links to the official text of the AI Act on EUR-Lex (Regulation (EU)
// 2024/1689). Each article has an anchor of the form #art_<n> in the
// consolidated HTML; annexes use #anx_<roman>.

const EUR_LEX = "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32024R1689";

/** The first article (or annex) a citation such as "Art. 26(7)" or "Art. 11, Annex IV" refers to. */
export function provisionAnchor(citation: string): { label: string; href: string } | null {
  const art = citation.match(/Art\.\s*(\d+)/);
  if (art) return { label: `Article ${art[1]}`, href: `${EUR_LEX}#art_${art[1]}` };
  const annex = citation.match(/Annex\s+([IVX]+)/);
  if (annex) return { label: `Annex ${annex[1]}`, href: `${EUR_LEX}#anx_${annex[1]}` };
  return null;
}
