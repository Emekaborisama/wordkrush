import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const template = readFileSync(
  fileURLToPath(new URL('../../supabase/templates/magic-link.html', import.meta.url)),
  'utf8',
);

describe('magic-link email template', () => {
  it('is WordKrush-branded and keeps the link plus OTP fallback', () => {
    expect(template).toContain('WordKrush');
    expect(template).toContain('{{ .ConfirmationURL }}');
    expect(template).toContain('{{ .Token }}');
    expect(template).not.toMatch(/href="\{\{\s*\.SiteURL\s*\}\}"/);
    expect(template.toLowerCase()).not.toContain('supabase');
  });
});
