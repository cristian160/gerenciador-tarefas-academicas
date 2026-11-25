// Interface: conversa com a API do servidor (/api/tarefas) e desenha as listas na tela.
const API = '/api/tarefas';

const formulario = document.getElementById('form-tarefa');
const tituloFormulario = document.getElementById('titulo-formulario');
const campoTitulo = document.getElementById('titulo');
const campoDisciplina = document.getElementById('disciplina');
const btnSalvar = document.getElementById('btn-salvar');
const btnCancelar = document.getElementById('btn-cancelar');
const mensagem = document.getElementById('mensagem');
const listaPendentes = document.getElementById('lista-pendentes');
const listaConcluidas = document.getElementById('lista-concluidas');

let idEmEdicao = null; // null = cadastrando; número = editando essa tarefa
let salvando = false;

// ---------- Comunicação com o servidor ----------
async function chamarApi(url, opcoes = {}) {
  let resposta;
  try {
    resposta = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opcoes });
  } catch {
    throw new Error('Servidor indisponível. Confira se o "npm start" está rodando.');
  }
  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => ({}));
    throw new Error(corpo.erro || 'Não foi possível concluir a operação.');
  }
  return resposta.status === 204 ? null : resposta.json();
}

async function carregarTarefas() {
  try {
    renderizar(await chamarApi(API));
  } catch (erro) {
    mostrarMensagem(erro.message);
  }
}

// Executa uma ação (concluir, excluir), fecha a edição se era essa tarefa e recarrega a lista.
async function executar(tarefa, chamada) {
  if (salvando) return;
  try {
    await chamada();
    if (idEmEdicao === tarefa.id) sairDoModoEdicao();
    await carregarTarefas();
  } catch (erro) {
    mostrarMensagem(erro.message);
  }
}

// ---------- Desenho da tela ----------
function mostrarMensagem(texto = '') {
  mensagem.textContent = texto;
}

function criarElemento(tag, classe, texto) {
  const elemento = document.createElement(tag);
  elemento.className = classe;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

function criarBotao(texto, classe, aoClicar) {
  const botao = criarElemento('button', classe, texto);
  botao.type = 'button';
  botao.addEventListener('click', aoClicar);
  return botao;
}

function criarItem(tarefa) {
  const item = criarElemento('li', 'tarefa');
  item.dataset.id = tarefa.id;

  const classeStatus = tarefa.status === 'Pendente' ? 'pendente' : 'concluida';
  const info = criarElemento('div', 'tarefa-info');
  info.append(
    criarElemento('strong', 'tarefa-titulo', tarefa.titulo),
    criarElemento('span', 'tarefa-disciplina', tarefa.disciplina),
    criarElemento('span', `tarefa-status ${classeStatus}`, tarefa.status)
  );

  const acoes = criarElemento('div', 'tarefa-acoes');
  if (tarefa.status === 'Pendente') {
    acoes.append(
      criarBotao('Editar', 'btn-editar', () => entrarNoModoEdicao(tarefa)),
      criarBotao('Concluir', 'btn-concluir', () =>
        executar(tarefa, () => chamarApi(`${API}/${tarefa.id}/concluir`, { method: 'PATCH' })))
    );
  }
  acoes.append(
    criarBotao('Excluir', 'btn-excluir', () =>
      executar(tarefa, () => chamarApi(`${API}/${tarefa.id}`, { method: 'DELETE' })))
  );

  item.append(info, acoes);
  return item;
}

function preencherLista(lista, tarefas, textoVazio) {
  lista.replaceChildren();
  if (tarefas.length === 0) {
    lista.append(criarElemento('li', 'vazio', textoVazio));
    return;
  }
  lista.append(...tarefas.map(criarItem));
}

function renderizar(tarefas) {
  const pendentes = tarefas.filter((tarefa) => tarefa.status === 'Pendente');
  const concluidas = tarefas.filter((tarefa) => tarefa.status === 'Concluída');
  for (const [id, quantidade] of [['total-pendentes', pendentes.length], ['total-concluidas', concluidas.length]]) {
    document.getElementById(id).textContent = quantidade === 1 ? '1 tarefa' : quantidade + ' tarefas';
  }
  preencherLista(listaPendentes, pendentes, 'Nenhuma tarefa pendente.');
  preencherLista(listaConcluidas, concluidas, 'Nenhuma tarefa concluída.');
}

// ---------- Modo de edição (o mesmo formulário serve para cadastrar e editar) ----------
function entrarNoModoEdicao(tarefa) {
  if (salvando) return;
  idEmEdicao = tarefa.id;
  campoTitulo.value = tarefa.titulo;
  campoDisciplina.value = tarefa.disciplina;
  tituloFormulario.textContent = 'Editar tarefa';
  btnSalvar.textContent = 'Salvar alterações';
  btnCancelar.hidden = false;
  formulario.classList.add('editando');
  mostrarMensagem();
  campoTitulo.focus();
}

function sairDoModoEdicao() {
  idEmEdicao = null;
  formulario.reset();
  tituloFormulario.textContent = 'Nova tarefa';
  btnSalvar.textContent = 'Adicionar tarefa';
  btnCancelar.hidden = true;
  formulario.classList.remove('editando');
  mostrarMensagem();
}

btnCancelar.addEventListener('click', sairDoModoEdicao);

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (salvando) return;
  const dados = { titulo: campoTitulo.value, disciplina: campoDisciplina.value };
  salvando = true;
  btnSalvar.disabled = true;
  btnCancelar.disabled = true;
  campoTitulo.disabled = true;
  campoDisciplina.disabled = true;
  btnSalvar.textContent = 'Salvando...';
  formulario.setAttribute('aria-busy', 'true');
  try {
    if (idEmEdicao === null) {
      await chamarApi(API, { method: 'POST', body: JSON.stringify(dados) });
    } else {
      await chamarApi(`${API}/${idEmEdicao}`, { method: 'PUT', body: JSON.stringify(dados) });
    }
    sairDoModoEdicao();
    await carregarTarefas();
  } catch (erro) {
    mostrarMensagem(erro.message);
  } finally {
    salvando = false;
    btnSalvar.disabled = false;
    btnCancelar.disabled = false;
    campoTitulo.disabled = false;
    campoDisciplina.disabled = false;
    btnSalvar.textContent = idEmEdicao === null ? 'Adicionar tarefa' : 'Salvar alterações';
    formulario.setAttribute('aria-busy', 'false');
  }
});

carregarTarefas();
