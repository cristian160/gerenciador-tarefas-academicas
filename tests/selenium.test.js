// Teste de interface com Selenium.
// Fluxo: abre o app -> cadastra uma tarefa única -> conclui -> atualiza a página -> confere "Concluída".
// Pré-requisito: o servidor precisa estar rodando em outro terminal ("npm start").
const assert = require('assert');
const { Builder, By, until } = require('selenium-webdriver');

const URL_APP = process.env.APP_URL || 'http://localhost:3000';
const NAVEGADOR = process.env.NAVEGADOR === 'edge' ? 'MicrosoftEdge' : 'chrome';
const ESPERA_MS = 10000;
const PAUSA_FINAL_MS = Number(process.env.PAUSA_FINAL_MS ?? 3000); // deixa o resultado visível na tela

const TITULO = `Teste Selenium ${Date.now()}`; // título único a cada execução
const DISCIPLINA = 'Ambientes de Desenvolvimento de Software';

// Localiza o <li class="tarefa"> com esse título dentro de #lista-pendentes ou #lista-concluidas.
const itemNaLista = (idLista, titulo) => By.xpath(
  `//ul[@id='${idLista}']/li[@class='tarefa']` +
  `[.//strong[@class='tarefa-titulo' and normalize-space(.)='${titulo}']]`
);

async function servidorDisponivel() {
  try {
    await fetch(URL_APP);
    return true;
  } catch {
    return false;
  }
}

async function executarTeste() {
  if (!(await servidorDisponivel())) {
    throw new Error(`O servidor não respondeu em ${URL_APP}. Deixe o "npm start" rodando em outro terminal.`);
  }

  const driver = await new Builder().forBrowser(NAVEGADOR).build();
  try {
    // 1. Abrir a aplicação e cadastrar a tarefa
    await driver.get(URL_APP);
    await driver.findElement(By.id('titulo')).sendKeys(TITULO);
    await driver.findElement(By.id('disciplina')).sendKeys(DISCIPLINA);
    await driver.findElement(By.id('btn-salvar')).click();

    // 2. A tarefa deve aparecer em "Pendentes" com status "Pendente"
    const pendente = await driver.wait(
      until.elementLocated(itemNaLista('lista-pendentes', TITULO)), ESPERA_MS,
      'A tarefa cadastrada não apareceu em Pendentes.');
    assert.strictEqual(await pendente.findElement(By.css('.tarefa-status')).getText(), 'Pendente',
      'A tarefa nova deveria começar como "Pendente".');

    // 3. Marcar essa mesma tarefa como concluída
    await pendente.findElement(By.css('.btn-concluir')).click();
    await driver.wait(
      until.elementLocated(itemNaLista('lista-concluidas', TITULO)), ESPERA_MS,
      'A tarefa não foi para Concluídas depois de clicar em "Concluir".');

    // 4. Atualizar a página (os dados vêm de novo do servidor/SQLite)
    await driver.navigate().refresh();

    // 5. O status "Concluída" deve ter sido mantido
    const concluida = await driver.wait(
      until.elementLocated(itemNaLista('lista-concluidas', TITULO)), ESPERA_MS,
      'Depois de atualizar a página, a tarefa não está em Concluídas.');
    assert.strictEqual(await concluida.findElement(By.css('.tarefa-status')).getText(), 'Concluída',
      'O status deveria continuar "Concluída" depois de atualizar a página.');
    const aindaPendentes = await driver.findElements(itemNaLista('lista-pendentes', TITULO));
    assert.strictEqual(aindaPendentes.length, 0, 'A tarefa não deveria continuar em Pendentes.');

    await driver.sleep(PAUSA_FINAL_MS);
  } finally {
    await driver.quit();
  }
}

executarTeste()
  .then(() => {
    console.log(`\nTESTE PASSOU: a tarefa "${TITULO}" continuou "Concluída" depois de atualizar a página.`);
  })
  .catch((erro) => {
    console.error(`\nTESTE FALHOU: ${erro.message}`);
    process.exitCode = 1;
  });
