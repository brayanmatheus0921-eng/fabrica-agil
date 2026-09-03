import assert from "node:assert/strict";
import test from "node:test";

import { getNextDiagnosticSequence } from "@/core/diagnostic-history";

test("reinicia a numeração quando não existem diagnósticos visíveis", () => {
  assert.equal(getNextDiagnosticSequence([]), 1);
});

test("continua após a maior numeração quando o diagnóstico 01 foi excluído", () => {
  assert.equal(
    getNextDiagnosticSequence([
      "Diagnóstico #2 · Operações · 06/08/2026",
      "Diagnóstico #4 · Financeiro · 06/08/2026",
    ]),
    5,
  );
});

test("mantém compatibilidade com registros antigos sem título", () => {
  assert.equal(getNextDiagnosticSequence([null, null]), 3);
});


