import { fileURLToPath } from 'node:url';

// The source and compiled files are both two levels beneath the repository root.
export const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
