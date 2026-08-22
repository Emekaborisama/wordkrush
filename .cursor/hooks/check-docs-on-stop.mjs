#!/usr/bin/env node

import { localChangedFiles, requiredDocumentsFor } from '../../scripts/check-docs.mjs';

const missing = requiredDocumentsFor(localChangedFiles());

if (missing.length === 0) {
  process.stdout.write('{}\n');
} else {
  const requirements = missing
    .map(({ document, reason }) => `- Update ${document}: ${reason}.`)
    .join('\n');

  process.stdout.write(
    `${JSON.stringify({
      followup_message: [
        'Before finishing, resolve the missing documentation:',
        requirements,
        'Update the real content; do not add placeholders merely to pass the check.',
      ].join('\n'),
    })}\n`,
  );
}
