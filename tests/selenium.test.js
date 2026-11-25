// Teste de interface com Selenium.
// Fluxo: cadastrar -> editar -> concluir -> atualizar -> excluir -> atualizar.
// Pré-requisito: o servidor precisa estar rodando em outro terminal ("npm start").
const assert = require('assert');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const edge = require('selenium-webdriver/edge');

const URL_APP = process.env.APP_URL || 'http://localhost:3000';
const NAVEGADOR = process.env.NAVEGADOR === 'edge' ? 'MicrosoftEdge' : 'chrome';
const ESPERA_MS = 10000;
const PAUSA_FINAL_MS = Number(process.env.PAUSA_FINAL_MS ?? 3000); // deixa o resultado visível na tela

const TITULO = `Teste Selenium ${Date.now()}`; // título único a cada execução
const DISCIPLINA = 'Ambientes de Desenvolvimento de Software';
const TITULO_EDITADO = `${TITULO} editado`;
const DISCIPLINA_EDITADA = 'Ambientes de Software - revisão';

// Localiza o <li class="tarefa"> com esse título dentro de #lista-pendentes ou #lista-concluidas.
const itemNaLista = (idLista, titulo) => By.xpath(
  `//ul[@id='${idLista}']/li[@class='tarefa']` +
  `[.//strong[@class='tarefa-titulo' and normalize-space(.)='${titulo}']]`
);

async function servidorDisponivel() {
  try {
    const resposta = await fetch(`${URL_APP.replace(/\/$/, '')}/api/tarefas`);
    if (!resposta.ok) return false;
    return Array.isArray(await resposta.json());
  } catch {
    return false;
  }
}

async function executarTeste() {
  if (!(await servidorDisponivel())) {
    throw new Error(`O servidor não respondeu em ${URL_APP}. Deixe o "npm start" rodando em outro terminal.`);
  }

  const construtor = new Builder().forBrowser(NAVEGADOR);
  // O modo normal continua abrindo o navegador para a demonstração.
  // SEM_INTERFACE=1 permite executar o mesmo teste em ambiente sem tela.
  if (process.env.SEM_INTERFACE === '1') {
    if (NAVEGADOR === 'chrome') {
      const opcoes = new chrome.Options().addArguments('--headless=new');
      if (process.env.CHROME_BINARY) opcoes.setChromeBinaryPath(process.env.CHROME_BINARY);
      construtor.setChromeOptions(opcoes);
    } else {
      construtor.setEdgeOptions(new edge.Options().addArguments('--headless=new'));
    }
  }
  const driver = await construtor.build();
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
    console.log('APROVADO: cadastro com status Pendente.');

    // 3. Editar os dois campos e conferir os dados depois de atualizar a página
    await pendente.findElement(By.css('.btn-editar')).click();
    assert.strictEqual(await driver.findElement(By.id('titulo')).getAttribute('value'), TITULO);
    const campoTitulo = await driver.findElement(By.id('titulo'));
    const campoDisciplina = await driver.findElement(By.id('disciplina'));
    await campoTitulo.clear();
    await campoTitulo.sendKeys(TITULO_EDITADO);
    await campoDisciplina.clear();
    await campoDisciplina.sendKeys(DISCIPLINA_EDITADA);
    await driver.findElement(By.id('btn-salvar')).click();
    await driver.wait(until.elementLocated(itemNaLista('lista-pendentes', TITULO_EDITADO)), ESPERA_MS,
      'A tarefa não apresentou o título editado.');
    await driver.navigate().refresh();
    const editada = await driver.wait(
      until.elementLocated(itemNaLista('lista-pendentes', TITULO_EDITADO)), ESPERA_MS,
      'A edição não foi mantida depois de atualizar a página.');
    assert.strictEqual(await editada.findElement(By.css('.tarefa-disciplina')).getText(), DISCIPLINA_EDITADA);
    assert.strictEqual(await editada.findElement(By.css('.tarefa-status')).getText(), 'Pendente');
    assert.strictEqual((await driver.findElements(itemNaLista('lista-pendentes', TITULO))).length, 0,
      'O cadastro original não deveria continuar na lista depois de editar.');
    console.log('APROVADO: edição de título e disciplina, mantida após atualizar a página.');

    // 4. Marcar essa mesma tarefa como concluída
    await editada.findElement(By.css('.btn-concluir')).click();
    await driver.wait(
      until.elementLocated(itemNaLista('lista-concluidas', TITULO_EDITADO)), ESPERA_MS,
      'A tarefa não foi para Concluídas depois de clicar em "Concluir".');
    console.log('APROVADO: conclusão da tarefa.');

    // 5. Atualizar a página (os dados vêm de novo do servidor/SQLite)
    await driver.navigate().refresh();

    // 6. O status "Concluída" deve ter sido mantido
    const concluida = await driver.wait(
      until.elementLocated(itemNaLista('lista-concluidas', TITULO_EDITADO)), ESPERA_MS,
      'Depois de atualizar a página, a tarefa não está em Concluídas.');
    assert.strictEqual(await concluida.findElement(By.css('.tarefa-status')).getText(), 'Concluída',
      'O status deveria continuar "Concluída" depois de atualizar a página.');
    const aindaPendentes = await driver.findElements(itemNaLista('lista-pendentes', TITULO_EDITADO));
    assert.strictEqual(aindaPendentes.length, 0, 'A tarefa não deveria continuar em Pendentes.');
    console.log('APROVADO: status Concluída mantido após atualizar a página.');

    await driver.sleep(PAUSA_FINAL_MS);

    // 7. Excluir somente a tarefa criada por este teste e conferir a exclusão
    await concluida.findElement(By.css('.btn-excluir')).click();
    await driver.wait(until.stalenessOf(concluida), ESPERA_MS,
      'A tarefa não saiu da lista depois da exclusão.');
    await driver.navigate().refresh();
    // Espera a resposta da listagem, inclusive quando há outras tarefas no banco.
    await driver.wait(until.elementLocated(By.css('#lista-pendentes > li')), ESPERA_MS);
    await driver.wait(until.elementLocated(By.css('#lista-concluidas > li')), ESPERA_MS);
    for (const lista of ['lista-pendentes', 'lista-concluidas']) {
      for (const titulo of [TITULO, TITULO_EDITADO]) {
        assert.strictEqual((await driver.findElements(itemNaLista(lista, titulo))).length, 0,
          'A tarefa excluída reapareceu depois de atualizar a página.');
      }
    }
    console.log('APROVADO: exclusão mantida após atualizar a página.');
  } finally {
    await driver.quit();
  }
}

executarTeste()
  .then(() => {
    console.log('\nTESTE PASSOU: cadastro, edição, conclusão, persistência e exclusão.');
  })
  .catch((erro) => {
    console.error(`\nTESTE FALHOU: ${erro.message}`);
    process.exitCode = 1;
  });
