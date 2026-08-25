import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const templatesDir = new URL('../../supabase/templates/', import.meta.url);

function readTemplate(name: string): string {
  return readFileSync(fileURLToPath(new URL(name, templatesDir)), 'utf8');
}

describe('magic-link email template', () => {
  const template = readTemplate('magic-link.html');

  it('is WordKrush-branded and keeps the link plus OTP fallback', () => {
    expect(template).toContain('WordKrush');
    expect(template).toContain('{{ .ConfirmationURL }}');
    expect(template).toContain('{{ .Token }}');
    expect(template).not.toMatch(/href="\{\{\s*\.SiteURL\s*\}\}"/);
    expect(template.toLowerCase()).not.toContain('supabase');
  });
});

describe('whats-new email template', () => {
  const template = readTemplate('whats-new.html');

  it('is WordKrush-branded and sells the games, not the changelog', () => {
    expect(template).toContain('WordKrush');
    expect(template).toContain('#FFB020');
    expect(template).toContain('Race your friends');
    expect(template).toContain('Clueless, three ways');
    expect(template).toContain('Wordfall hits harder');
    expect(template).toContain('https://wordkrush.com/?utm_source=email&amp;utm_medium=product-update');
    expect(template).toContain('{{{RESEND_UNSUBSCRIBE_URL}}}');
    expect(template).not.toContain('{{ .ConfirmationURL }}');
    expect(template).not.toContain('{{ .Token }}');
    expect(template).not.toMatch(/href="\{\{\s*\.SiteURL\s*\}\}"/);
    expect(template.toLowerCase()).not.toContain('supabase');
    expect(template.toLowerCase()).not.toContain('reducer');
    expect(template.toLowerCase()).not.toContain('changelog');
    expect(template.toLowerCase()).not.toContain('migration');
  });
});
