import assert from "node:assert/strict";
import test from "node:test";
import { asksToCreateTask, declaresTaskScope, findReferencedTask } from "./task-intent";

test("distingue criação de tarefa de registro em uma tarefa existente", () => {
  assert.equal(asksToCreateTask("Crie uma tarefa para conferir os pedidos."), true);
  assert.equal(asksToCreateTask("Inclua a tarefa Revisar medidas."), true);
  assert.equal(asksToCreateTask("Registre estes dados no formulário da tarefa atual."), false);
  assert.equal(asksToCreateTask("Marque a tarefa como concluída e registre o relato."), false);
  assert.equal(asksToCreateTask("Crie um documento ligado à tarefa do plano."), false);
});

test("reconhece quando o gestor já classificou o vínculo da tarefa", () => {
  assert.equal(declaresTaskScope("É uma tarefa avulsa, fora do plano."), true);
  assert.equal(declaresTaskScope("Faz parte do plano atual."), true);
  assert.equal(declaresTaskScope("Crie uma tarefa para amanhã."), false);
});

test("resolve somente uma tarefa citada inequivocamente pelo nome", () => {
  const tasks = [{ id: "t1", title: "Levantar erros de medida dos pedidos." }, { id: "t2", title: "Revisar resultados semanalmente" }];
  assert.equal(findReferencedTask("Registre uma nota em Levantar erros de medida dos pedidos", tasks)?.id, "t1");
  assert.equal(findReferencedTask("Registre uma nota na tarefa", tasks), null);
});
