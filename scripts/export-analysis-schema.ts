import { writeFileSync } from 'node:fs';
import { z } from 'zod';
import { format } from 'prettier';
import { classificationSchema, analysisResultSchema } from '../packages/shared/src/analysis.ts';
writeFileSync(
  'services/analysis/src/waste2watt_analysis/schemas.json',
  await format(
    JSON.stringify(
      {
        classification: z.toJSONSchema(classificationSchema),
        analysis: z.toJSONSchema(analysisResultSchema),
      },
      null,
      2,
    ),
    { parser: 'json' },
  ),
);
