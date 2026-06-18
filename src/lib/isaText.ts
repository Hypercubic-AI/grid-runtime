// JSON <-> text conversion surface. The converters are defined in isa.ts (the single
// validator/serializer); this module re-exports them for callers that think in "convert".
export { instructionsToText, textToInstructions } from './isa';
