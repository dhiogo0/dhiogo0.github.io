# 📋 Documentação Técnica — Integração Sorteio → Campeonato
**Racha Fácil v2.0 · Suplemento 2 da championship-module.md**

---

## Índice

1. [Visão Geral do Problema](#1-visão-geral-do-problema)
2. [Taxonomia de Times](#2-taxonomia-de-times)
3. [Modelo de Dados Revisado](#3-modelo-de-dados-revisado)
4. [Fluxos de Usuário](#4-fluxos-de-usuário)
5. [Conversão de Time Gerado → Time do Dia](#5-conversão-de-time-gerado--time-do-dia)
6. [Ciclo de Vida de um Time do Dia](#6-ciclo-de-vida-de-um-time-do-dia)
7. [Casos Críticos e Decisões de Design](#7-casos-críticos-e-decisões-de-design)
8. [Integração com o Store Existente](#8-integração-com-o-store-existente)
9. [Componentes de UI Necessários](#9-componentes-de-ui-necessários)
10. [Algoritmos e Funções](#10-algoritmos-e-funções)
11. [Arquitetura de Arquivos Revisada](#11-arquitetura-de-arquivos-revisada)
12. [Guia de Implementação](#12-guia-de-implementação)

---

## 1. Visão Geral do Problema

### O cenário mais comum ignorado

```
Situação real na quadra:
─────────────────────────────────────────────────────────
  1. Galera chega. 14 jogadores.
  2. Usuário abre o app → adiciona todo mundo → sorteia.
  3. App gera: Leões (5 jog.) | Tubarões (5 jog.) | 4 reservas.
  4. Usuário quer: "vamos fazer pontos corridos, esses 2 times
     mais os reservas formam um 3º time".
  5. App atual: não tem esse caminho. Fim.
─────────────────────────────────────────────────────────
```

O módulo de campeonato documentado anteriormente **só aceita times fixos pré-cadastrados**. Isso exige que o usuário:
1. Primeiro crie times fixos
2. Cadastre jogadores neles
3. Só então crie um campeonato

Esse fluxo é longo demais para uso na quadra. O fluxo real precisa ser:

```
Sortear → "Fazer campeonato com esses times?" → Sim → Campeonato começa
```

### Três origens possíveis de times em um campeonato

| Origem | Descrição | Persistência |
|---|---|---|
| **FixedTeam** | Time cadastrado manualmente com roster fixo | Permanente |
| **DayTeam** | Time gerado pelo sorteio, salvo para o campeonato | Temporária (vinculada ao campeonato) |
| **HybridTeam** | FixedTeam com roster ajustado no dia | Permanente + snapshot do dia |

O campeonato precisa aceitar **qualquer combinação** dessas três origens.

---

## 2. Taxonomia de Times

### 2.1 `FixedTeam` — já documentado

Time com identidade própria, criado manualmente, reutilizável em múltiplos campeonatos.

### 2.2 `DayTeam` — novo

Time gerado pelo sorteio do dia. Existe **somente no contexto do campeonato** ao qual foi vinculado. Não aparece na lista global de times fixos.

```js
{
  id:         1700000000000,
  type:       "day",              // 🆕 distingue da origem
  name:       "Leões",            // nome automático, editável
  color:      "#00e87a",          // cor automática do sorteio
  emoji:      "⚽",               // emoji padrão, editável
  players:    [ /* roster do sorteio */ ],
  sourceType: "draw",             // veio do sorteio
  drawId:     1700000000001,      // ID do sorteio que gerou esse time
  locked:     false,              // true = roster não pode mais mudar
  createdAt:  "2025-05-01T10:00:00.000Z",
  championshipId: 1700000000002,  // campeonato ao qual pertence
}
```

### 2.3 `HybridTeam` — novo

Quando um `FixedTeam` tem seu roster ajustado para o campeonato do dia (ex: um titular não veio, entrou um reserva). O time original não é alterado — é criado um snapshot.

```js
{
  id:            1700000000000,
  type:          "hybrid",
  name:          "Cobras FC",           // nome do FixedTeam original
  color:         "#f97316",
  emoji:         "🐍",
  sourceType:    "fixed",
  fixedTeamId:   1700000000099,         // referência ao time original
  players:       [ /* roster do dia, pode diferir do original */ ],
  playerChanges: [                      // log de diferenças
    { type: "added",   playerId: 111 },
    { type: "removed", playerId: 222 },
  ],
  locked:        false,
  createdAt:     "2025-05-01T10:00:00.000Z",
  championshipId: 1700000000002,
}
```

### 2.4 `ChampionshipTeam` — tipo unificado no campeonato

Dentro do campeonato, todos os times (independente da origem) são tratados como `ChampionshipTeam`. Isso simplifica toda a lógica de standings, geração de rodadas e match cards.

```js
// No Championship, teams é um array de ChampionshipTeam
{
  id:         1700000000000,    // ID único dentro do campeonato
  type:       "day" | "fixed" | "hybrid",
  name:       "Leões",
  color:      "#00e87a",
  emoji:      "⚽",
  players:    [ /* roster efetivo do campeonato */ ],
  sourceRef:  null | fixedTeamId,   // referência à origem
}
```

---

## 3. Modelo de Dados Revisado

### 3.1 `DrawSession` — sessão de sorteio (novo)

O sorteio agora gera uma sessão persistida. Isso resolve o problema de "o usuário re-sorteia e perde o campeonato que estava montando".

```js
{
  id:          1700000000000,
  createdAt:   "2025-05-01T10:00:00.000Z",
  players:     [ /* snapshot dos jogadores no momento do sorteio */ ],
  teams:       [
    {
      id:      1700000000001,
      name:    "Leões",
      color:   "#00e87a",
      players: [ /* jogadores desse time */ ],
    },
  ],
  reserves:    [ /* jogadores reservas */ ],
  config: {
    playersPerTeam: 5,
    algorithm:      "snake-draft",
  },
  usedInChampionshipId: null,   // null = ainda não foi usado
}
```

### 3.2 `Championship` — campos adicionados

```js
{
  // ...campos já documentados...

  // 🆕 origem dos times
  teamsSource: "fixed"      // só FixedTeams
             | "draw"       // só DayTeams (gerados pelo sorteio)
             | "mixed",     // combinação de origens

  // 🆕 referência ao sorteio que originou os times (se aplicável)
  drawSessionId: null | 1700000000000,

  // 🆕 times agora são ChampionshipTeam (não mais FixedTeam.id)
  teams: [ /* ChampionshipTeam[] — ver seção 2.4 */ ],
}
```

### 3.3 `store.js` — campos adicionados ao store existente

```js
// Adicionar ao store existente (sem remover nada)
export const store = {
  // ...campos já existentes...

  // 🆕
  drawHistory: [],          // DrawSession[] — histórico de sorteios
  currentDrawId: null,      // ID do sorteio atual (se houver)
};
```

---

## 4. Fluxos de Usuário

### 4.1 Fluxo principal — sorteio → campeonato imediato

```
[Tela de Sorteio — resultado exibido]
  │
  │ Botão: "⚽ Fazer Campeonato com Esses Times"
  ▼
[Modal: Tipo de Campeonato]
  ┌─────────────────────────────────────┐
  │  O que você quer jogar hoje?        │
  │                                     │
  │  ⚽ Pontos Corridos                 │
  │  🏆 Mata-mata                       │
  │  🔀 Grupos + Mata-mata              │
  └─────────────────────────────────────┘
  │
  ▼
[Configuração rápida — 1 tela só]
  - Nome do campeonato (sugerido: "Racha — 01/05")
  - Duração de cada tempo (slider)
  - Número de tempos por partida
  - [Configurações avançadas ▼] (oculto por padrão)
  │
  ▼
[Preview dos times gerados]
  ┌────────────────────────────────────────┐
  │  Times do campeonato                   │
  │                                        │
  │  ⚽ Leões      5 jogadores   ✏️        │
  │  🌊 Tubarões  5 jogadores   ✏️        │
  │                                        │
  │  🔄 Reservas (4)            ✏️        │
  │  (clique para distribuir nos times)    │
  │                                        │
  │  [+ Adicionar time manual]             │
  └────────────────────────────────────────┘
  │
  ▼
[Confirmar]
  → Campeonato criado e ativo
  → Vai direto para o Dashboard
```

### 4.2 Fluxo alternativo — campeonato com times fixos + times do dia

```
[Criar campeonato — passo 2: selecionar times]
  ┌──────────────────────────────────────────────┐
  │  Adicionar times                             │
  │                                              │
  │  [🗂️ Times Cadastrados]  [⚽ Último Sorteio] │
  │                                              │
  │  ── Times Cadastrados ──                     │
  │  ☑ Cobras FC      (8 jog.)                  │
  │  ☑ Falcões United (7 jog.)                  │
  │  ☐ Leões FC       (6 jog.)                  │
  │                                              │
  │  ── Último Sorteio (01/05) ──                │
  │  ☑ Leões    (5 jog. sorteados)              │
  │  ☑ Tubarões (5 jog. sorteados)              │
  │                                              │
  │  Total selecionado: 4 times                  │
  └──────────────────────────────────────────────┘
```

### 4.3 Fluxo de re-sorteio com campeonato pendente

```
[Usuário clica "🔁 Re-sortear" na tela de times]
  │
  ▼
[Verificação automática]
  Existe campeonato em setup usando o sorteio atual?
  │
  ├── NÃO → re-sorteia normalmente
  │
  └── SIM → Modal de aviso:
      ┌─────────────────────────────────────────┐
      │  ⚠️  Você tem um campeonato em           │
      │  configuração usando esses times.        │
      │                                          │
      │  Re-sortear vai resetar os times         │
      │  do campeonato.                          │
      │                                          │
      │  [Cancelar]  [Re-sortear mesmo assim]   │
      └─────────────────────────────────────────┘
      │
      ├── Cancelar → volta ao sorteio atual
      └── Confirmar → re-sorteia + atualiza campeonato em setup
                      (campeonatos já INICIADOS não são afetados)
```

### 4.4 Fluxo de edição de times antes do campeonato

```
[Preview dos times — botão ✏️ em um time]
  │
  ▼
[Modal: Editar Time do Dia]
  ┌──────────────────────────────────────────────┐
  │  ✏️  Editar Leões                            │
  │                                              │
  │  Nome:  [Leões FC____________]               │
  │  Emoji: [⚽] [🦁] [🔥] [⚡] [💎] ...        │
  │  Cor:   [●] [●] [●] [●] ...                 │
  │                                              │
  │  ── Jogadores ──                             │
  │  🧤 Carlos  (GK) ⭐⭐⭐     [↕ Mover]      │
  │  ⚡ João   (ATK) ⭐⭐⭐⭐   [↕ Mover]      │
  │  ⚙️ Maria  (MID) ⭐⭐⭐     [↕ Mover]      │
  │                                              │
  │  ── Reservas disponíveis ──                  │
  │  🛡️ Pedro  (DEF) ⭐⭐      [+ Adicionar]   │
  │  ⚡ Ana    (ATK) ⭐⭐⭐⭐⭐  [+ Adicionar]  │
  │                                              │
  │  [Salvar]                                    │
  └──────────────────────────────────────────────┘
```

### 4.5 Fluxo de distribuição de reservas

```
[Preview dos times — clique em "Reservas (4)"]
  │
  ▼
[Tela: Distribuir Reservas]
  ┌──────────────────────────────────────────────┐
  │  🔄 Distribuir Reservas                      │
  │                                              │
  │  Pedro  (DEF) ⭐⭐    → [Leões ▼]           │
  │  Ana    (ATK) ⭐⭐⭐⭐⭐ → [Tubarões ▼]       │
  │  Luan   (MID) ⭐⭐⭐   → [Reserva ▼]         │
  │  Sofia  (GK)  ⭐⭐⭐   → [Leões ▼]           │
  │                                              │
  │  [Distribuir automaticamente]                │
  │  (balanceia por estrelas)                    │
  │                                              │
  │  [Confirmar distribuição]                    │
  └──────────────────────────────────────────────┘
```

---

## 5. Conversão de Time Gerado → Time do Dia

### `src/logic/drawToChampionship.js` — arquivo novo

```js
import { snakeDraft, teamAvg } from './balance.js';

/**
 * Converte o resultado de um sorteio em times prontos para um campeonato.
 * Retorna ChampionshipTeam[] baseado nos times gerados.
 *
 * @param {DrawSession} drawSession - sessão de sorteio salva
 * @returns {ChampionshipTeam[]}
 */
export function convertDrawToChampionshipTeams(drawSession) {
  return drawSession.teams.map(team => ({
    id:         team.id,
    type:       'day',
    name:       team.name,
    color:      team.color,
    emoji:      '⚽',           // padrão — usuário pode editar
    players:    [...team.players],
    sourceType: 'draw',
    sourceRef:  null,
    drawId:     drawSession.id,
    locked:     false,
  }));
}

/**
 * Converte um FixedTeam em ChampionshipTeam.
 * O roster pode ter ajustes manuais (playerChanges).
 *
 * @param {FixedTeam} fixedTeam
 * @param {object[]}  playerChanges - [{ type:'added'|'removed', playerId }]
 * @returns {ChampionshipTeam}
 */
export function convertFixedToChampionshipTeam(fixedTeam, playerChanges = []) {
  let players = [...fixedTeam.players];

  for (const change of playerChanges) {
    if (change.type === 'removed') {
      players = players.filter(p => p.id !== change.playerId);
    }
    if (change.type === 'added') {
      // O jogador adicionado precisa vir do store global de jogadores
      // essa resolução acontece no caller
      players.push(change.player);
    }
  }

  return {
    id:            fixedTeam.id,
    type:          playerChanges.length > 0 ? 'hybrid' : 'fixed',
    name:          fixedTeam.name,
    color:         fixedTeam.color,
    emoji:         fixedTeam.emoji,
    players,
    sourceType:    'fixed',
    sourceRef:     fixedTeam.id,
    playerChanges,
    locked:        false,
  };
}

/**
 * Distribui reservas entre os times automaticamente,
 * tentando manter o equilíbrio de estrelas.
 *
 * @param {ChampionshipTeam[]} teams
 * @param {Player[]}           reserves
 * @returns {ChampionshipTeam[]} times atualizados com reservas distribuídas
 */
export function distributeReserves(teams, reserves) {
  if (!reserves.length) return teams;

  const sorted    = [...reserves].sort((a, b) => b.level - a.level);
  const updated   = teams.map(t => ({ ...t, players: [...t.players] }));

  for (const reserve of sorted) {
    // Adiciona ao time com menor média atual
    const target = updated.reduce((min, t) =>
      teamAvg(t) < teamAvg(min) ? t : min
    );
    target.players.push(reserve);
  }

  return updated;
}

/**
 * Salva o sorteio atual como DrawSession no store.
 * Chamado automaticamente após cada sorteio bem-sucedido.
 *
 * @param {object} storeState - estado atual do store (teams, reserves, players)
 * @param {object} config     - { playersPerTeam }
 * @returns {DrawSession}
 */
export function createDrawSession(storeState, config) {
  return {
    id:                   Date.now(),
    createdAt:            new Date().toISOString(),
    players:              [...storeState.players],
    teams:                JSON.parse(JSON.stringify(storeState.teams)),
    reserves:             [...storeState.reserves],
    config: {
      playersPerTeam: config.playersPerTeam,
      algorithm:      'snake-draft',
    },
    usedInChampionshipId: null,
  };
}

/**
 * Gera o nome sugerido para o campeonato do dia.
 * Ex: "Racha — Qua 01/05"
 */
export function suggestChampionshipName() {
  const now  = new Date();
  const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const day  = days[now.getDay()];
  const date = now.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
  return `Racha — ${day} ${date}`;
}
```

---

## 6. Ciclo de Vida de um Time do Dia

```
[Sorteio executado]
        │
        ▼
  DrawSession criada e salva
  (teams são efêmeros → agora têm identidade)
        │
        ├──────────────────────────────────────────┐
        │                                          │
        ▼                                          ▼
[Usuário descarta]                    [Usuário cria campeonato]
DrawSession fica no histórico          convertDrawToChampionshipTeams()
por 7 dias e some                      DayTeams vinculados ao campeonato
                                                   │
                              ┌────────────────────┼──────────────────────┐
                              │                    │                      │
                              ▼                    ▼                      ▼
                    [Campeonato em setup]  [Campeonato ongoing]  [Campeonato finished]
                    Times editáveis        Times LOCKED          Times congelados
                    Reservas distribuíveis Roster não muda        para sempre
                    Re-sorteio possível    Re-sorteio bloqueado
                    (com aviso)
```

### Regra do `locked`

```js
// Um time fica locked quando a primeira partida dele é iniciada (status: 'live')
// Após isso, o roster não pode mais mudar

function lockTeamIfMatchStarted(championship, teamId) {
  const hasLiveMatch = championship.groupRounds
    .concat(championship.knockoutRounds)
    .flatMap(r => r.matches)
    .some(m =>
      (m.homeTeamId === teamId || m.awayTeamId === teamId) &&
      m.status === 'live'
    );

  if (hasLiveMatch) {
    const team = championship.teams.find(t => t.id === teamId);
    if (team) team.locked = true;
  }
}
```

---

## 7. Casos Críticos e Decisões de Design

### Caso 1 — Re-sorteio com campeonato em setup

**Situação:** Usuário sorteia, começa a montar o campeonato, depois clica em re-sortear.

**Decisão:** Mostrar aviso. Se confirmar, o campeonato em `"setup"` tem seus times atualizados. Campeonatos já em `"group-phase"` ou `"knockout-phase"` **não são afetados** — eles têm snapshot próprio.

```js
export function handleResortear(store, championshipStore) {
  const pendingChamp = championshipStore.championships.find(c =>
    c.status === 'setup' && c.drawSessionId === store.currentDrawId
  );

  if (pendingChamp) {
    return { requiresConfirmation: true, affectedChampionship: pendingChamp };
  }

  // Sem campeonato pendente → re-sorteia direto
  executeDraw(store);
}
```

### Caso 2 — Times com número desigual de jogadores

**Situação:** Sorteio gerou Leões (5) e Tubarões (4) porque o número não é múltiplo exato. Ou o usuário redistribuiu reservas de forma desigual.

**Decisão:** Permitir, mas mostrar aviso visual no preview e no dashboard. Times com número diferente são comuns em rachas. O algoritmo de standings não é afetado (usa pontos, não número de jogadores).

```js
// Em ChampionshipSetup.js — preview dos times
function renderTeamSizeWarning(teams) {
  const sizes = teams.map(t => t.players.length);
  const allEqual = sizes.every(s => s === sizes[0]);

  if (!allEqual) {
    return `
      <div class="warn-box">
        ⚠️ Os times têm números diferentes de jogadores.
        Isso é permitido, mas pode afetar o equilíbrio.
      </div>
    `;
  }
  return '';
}
```

### Caso 3 — Campeonato longo (várias semanas), jogadores mudam

**Situação:** O racha é toda semana. O campeonato dura 4 semanas. Na semana 3, um jogador saiu do grupo e outro entrou.

**Decisão:** Suportado via `playerChanges` no `HybridTeam`. O usuário pode editar o roster de um time **entre rodadas** (nunca durante uma partida em andamento). O log de `playerChanges` registra todas as alterações.

```js
// Regra: só pode editar roster entre rodadas
function canEditTeamRoster(championship, teamId) {
  const hasAnyLiveMatch = championship.groupRounds
    .concat(championship.knockoutRounds)
    .flatMap(r => r.matches)
    .some(m =>
      (m.homeTeamId === teamId || m.awayTeamId === teamId) &&
      m.status === 'live'
    );
  return !hasAnyLiveMatch;
}
```

### Caso 4 — Todos os jogadores são reservas (só 2 times)

**Situação:** 12 jogadores, 2 times de 5, sobram 2 reservas. Usuário quer jogar pontos corridos mas só tem 2 times.

**Decisão:** Pontos corridos com 2 times não faz sentido (só 1 confronto). O app deve:
- Sugerir formato **Mata-mata** (1 partida ou melhor de 3)
- Ou sugerir redistribuir as reservas para ter times menores mas mais opções

```js
// Em ChampionshipSetup.js — validação de formato
function validateFormatForTeamCount(format, numTeams) {
  if (format === 'round-robin' && numTeams < 3) {
    return {
      valid: false,
      suggestion: 'knockout',
      message: 'Pontos corridos precisa de ao menos 3 times. Que tal um Mata-mata?',
    };
  }
  if (format === 'groups+knockout' && numTeams < 4) {
    return {
      valid: false,
      suggestion: 'knockout',
      message: 'Grupos + Mata-mata precisa de ao menos 4 times.',
    };
  }
  return { valid: true };
}
```

### Caso 5 — Usuário quer usar time do sorteio + time fixo no mesmo campeonato

**Situação:** "Esses 2 times gerados hoje + o time da empresa que já está cadastrado."

**Decisão:** Totalmente suportado. A tela de seleção de times (fluxo 4.2) mostra as duas fontes. O campeonato terá `teamsSource: "mixed"`.

```js
// A única diferença interna é o campo `type` em cada ChampionshipTeam
// A lógica de standings, rounds e match cards é idêntica para todos os tipos
```

### Caso 6 — Usuário re-sorteia depois que o campeonato já começou

**Situação:** Campeonato em `"group-phase"`. Usuário vai na aba de sorteio e re-sorteia.

**Decisão:** Re-sorteio é **completamente independente** do campeonato em andamento. A `DrawSession` nova não afeta nada. O campeonato já tem snapshot próprio. O app não emite nenhum aviso nesse caso.

---

## 8. Integração com o Store Existente

### Mudanças no `store.js` existente

```js
// Adicionar ao estado — MÍNIMO necessário, sem quebrar nada
export const store = {
  // ...tudo que já existe...

  // 🆕 Histórico de sorteios (máx 10 sessões)
  drawHistory:    loadDrawHistory(),
  currentDrawId:  null,
};

// 🆕 Após executar o sorteio (no draw() existente), adicionar:
export function draw(onDone) {
  store.step = 2;
  setTimeout(() => {
    const shuffled = [...store.players].sort(() => Math.random() - 0.5);
    const result   = snakeDraft(shuffled, store.playersPerTeam);
    store.teams        = result.teams;
    store.reserves     = result.reserves;
    store.history      = [];
    store.swapMode     = false;
    store.swapSelected = null;
    store.step         = 3;

    // 🆕 Salvar DrawSession
    const session = createDrawSession(store, { playersPerTeam: store.playersPerTeam });
    store.currentDrawId = session.id;
    store.drawHistory   = [session, ...store.drawHistory].slice(0, 10); // max 10
    saveDrawHistory(store.drawHistory);

    onDone();
  }, 2200);
}
```

### Mudanças no `championshipStore.js`

```js
// 🆕 Action: criar campeonato a partir do sorteio atual
export function createChampionshipFromDraw(drawSession, format, config) {
  const dayTeams = convertDrawToChampionshipTeams(drawSession);

  const championship = {
    id:           Date.now(),
    name:         suggestChampionshipName(),
    format,
    status:       'setup',
    currentPhase: null,
    teamsSource:  'draw',
    drawSessionId: drawSession.id,
    teams:        dayTeams,
    matchConfig:  config.matchConfig,
    scoringConfig: DEFAULT_SCORING_CONFIG,
    groupsConfig:  format === 'groups+knockout' ? config.groupsConfig : null,
    groupRounds:   [],
    knockoutRounds: [],
    groups:        [],
    createdAt:    new Date().toISOString(),
  };

  saveChampionship(championship);
  championshipStore.championships.push(championship);
  championshipStore.activeChampId = championship.id;

  // Marcar drawSession como usada
  drawSession.usedInChampionshipId = championship.id;
  saveDrawHistory(store.drawHistory);

  return championship;
}

// 🆕 Action: iniciar campeonato (gerar rodadas) — de qualquer origem
export function startChampionship(championshipId) {
  const c = _getChampionship(championshipId);

  switch (c.format) {
    case 'round-robin':
      c.groupRounds  = generateRoundRobin(c.teams.map(t => t.id));
      c.status       = 'group-phase';
      c.currentPhase = 'groups';
      break;

    case 'knockout':
      c.knockoutRounds = generateKnockout(c.teams.map(t => t.id), c.matchConfig);
      c.status         = 'knockout-phase';
      c.currentPhase   = 'knockout';
      break;

    case 'groups+knockout':
      c.groups       = generateGroups(c.teams.map(t => t.id), c.groupsConfig.numGroups);
      c.groupRounds  = generateGroupRounds(c.groups, c.matchConfig);
      c.status       = 'group-phase';
      c.currentPhase = 'groups';
      break;
  }

  c.startedAt = new Date().toISOString();
  saveChampionship(c);
  _saveAndRender();
}
```

---

## 9. Componentes de UI Necessários

### 9.1 Botão pós-sorteio — `src/components/teams.js`

Adicionar ao rodapé da tela de times (step 3), abaixo das ações existentes:

```js
// Em renderTeams() — adicionar após o balance bar e actions row
function renderChampionshipCTA(drawSession) {
  if (!drawSession) return '';

  return `
    <div class="championship-cta">
      <div class="championship-cta__divider">ou</div>
      <button
        class="btn btn--championship"
        onclick="App.openChampionshipFromDraw()">
        🏆 Fazer Campeonato com Esses Times
      </button>
    </div>
  `;
}
```

### 9.2 Modal de formato rápido — `src/components/championships/QuickFormatModal.js`

```js
/**
 * Modal simples exibido quando usuário clica em "Fazer Campeonato".
 * Coleta apenas o essencial: formato + duração dos tempos.
 * Configurações avançadas ficam em ChampionshipSetup.js.
 */
export function renderQuickFormatModal(drawSession) {
  const suggestedName = suggestChampionshipName();
  const teamCount     = drawSession.teams.length;

  return `
    <div class="modal-overlay" onclick="App.closeModal()">
      <div class="modal" onclick="event.stopPropagation()">
        <h2 class="modal__title">🏆 Campeonato do Dia</h2>

        <div class="field">
          <label class="field__label">Nome</label>
          <input class="input" id="champName" value="${suggestedName}" />
        </div>

        <div class="field">
          <label class="field__label">Formato</label>
          <div class="format-grid">
            ${_formatOption('round-robin', '⚽', 'Pontos Corridos',
                teamCount < 3 ? 'Precisa de 3+ times' : '', teamCount >= 3)}
            ${_formatOption('knockout',    '🏆', 'Mata-mata', '', true)}
            ${_formatOption('groups+knockout', '🔀', 'Grupos + Mata-mata',
                teamCount < 4 ? 'Precisa de 4+ times' : '', teamCount >= 4)}
          </div>
        </div>

        <div class="field">
          <label class="field__label">Duração de cada tempo</label>
          <div class="counter-row">
            <button class="counter-btn" onclick="App.adjustHalfDuration(-5)">−</button>
            <div class="counter-center">
              <span class="counter-num" id="halfDurationVal">10</span>
              <span class="counter-label">minutos</span>
            </div>
            <button class="counter-btn" onclick="App.adjustHalfDuration(5)">+</button>
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-top:20px">
          <button class="btn btn--ghost" onclick="App.closeModal()">Cancelar</button>
          <button class="btn btn--primary" onclick="App.confirmQuickChampionship()">
            Criar Campeonato →
          </button>
        </div>
      </div>
    </div>
  `;
}

function _formatOption(id, emoji, label, note, enabled) {
  return `
    <button
      class="format-option ${!enabled ? 'format-option--disabled' : ''}"
      data-format="${id}"
      ${!enabled ? 'disabled' : ''}
      onclick="App.selectFormat('${id}')">
      <span class="format-option__emoji">${emoji}</span>
      <span class="format-option__label">${label}</span>
      ${note ? `<span class="format-option__note">${note}</span>` : ''}
    </button>
  `;
}
```

### 9.3 Preview e edição dos times — `src/components/championships/DayTeamsPreview.js`

```js
/**
 * Tela de preview e edição dos times antes de iniciar o campeonato.
 * Permite: renomear, trocar emoji/cor, mover jogadores, distribuir reservas.
 */
export function renderDayTeamsPreview(championship, reserves) {
  const { teams } = championship;
  const sizes      = teams.map(t => t.players.length);
  const allEqual   = sizes.every(s => s === sizes[0]);

  return `
    <div class="fade-up">
      <p class="card__headline">⚽ TIMES DO CAMPEONATO</p>

      ${!allEqual ? `
        <div class="warn-box" style="margin-bottom:14px">
          ⚠️ Times com número diferente de jogadores. Ajuste se quiser.
        </div>` : ''}

      ${teams.map(team => _renderDayTeamCard(team)).join('')}

      ${reserves.length > 0 ? `
        <div class="reserves-card">
          <div class="reserves-card__header">
            <span class="reserves-card__title">🔄 RESERVAS</span>
            <button class="btn btn--ghost btn--sm"
              onclick="App.distributeReservesAuto()">
              ✨ Distribuir automaticamente
            </button>
          </div>
          ${reserves.map(p => _renderReserveDistributeRow(p, teams)).join('')}
        </div>` : ''}

      <div style="margin-top:20px">
        <button class="btn btn--primary btn--draw"
          onclick="App.startChampionship()">
          🏆 INICIAR CAMPEONATO!
        </button>
      </div>
    </div>
  `;
}

function _renderDayTeamCard(team) {
  return `
    <div class="team-card" style="margin-bottom:12px">
      <div class="team-card__header"
        style="background:linear-gradient(135deg,${team.color}18,${team.color}06)">
        <div class="team-card__name-wrap">
          <span style="font-size:20px;margin-right:8px">${team.emoji}</span>
          <span class="team-card__name">${team.name.toUpperCase()}</span>
        </div>
        <button class="icon-btn" onclick="App.editDayTeam('${team.id}')">✏️</button>
      </div>
      <div class="team-card__body">
        ${team.players.map(p => `
          <div class="team-player">
            <span class="team-player__icon">${posIcon(p.position)}</span>
            <span class="team-player__name">${escHtml(p.name)}</span>
            <span class="team-player__pos">${posLabel(p.position)}</span>
            ${starsDisplay(p.level)}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function _renderReserveDistributeRow(player, teams) {
  const options = teams.map(t =>
    `<option value="${t.id}">${t.name}</option>`
  ).join('');

  return `
    <div class="reserve-row">
      <span class="reserve-row__icon">${posIcon(player.position)}</span>
      <span class="reserve-row__name">${escHtml(player.name)}</span>
      ${starsDisplay(player.level)}
      <select class="input" style="width:auto;padding:6px 10px;font-size:13px"
        onchange="App.assignReserve(${player.id}, this.value)">
        <option value="">Reserva</option>
        ${options}
      </select>
    </div>
  `;
}
```

---

## 10. Algoritmos e Funções

### `src/utils/drawStorage.js` — novo arquivo

```js
const KEY = 'racha_draw_history';

export function loadDrawHistory() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

export function saveDrawHistory(history) {
  // Mantém apenas os últimos 10 sorteios e purga os com mais de 7 dias
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const pruned = history
    .filter(s => new Date(s.createdAt).getTime() > cutoff)
    .slice(0, 10);
  localStorage.setItem(KEY, JSON.stringify(pruned));
}

export function getLastDrawSession(history) {
  return history[0] || null;
}

export function markDrawAsUsed(history, drawId, championshipId) {
  return history.map(s =>
    s.id === drawId ? { ...s, usedInChampionshipId: championshipId } : s
  );
}
```

### `src/app.js` — novos handlers no `window.App`

```js
// Adicionar ao window.App existente

App.openChampionshipFromDraw = function() {
  const draw = getLastDrawSession(store.drawHistory);
  if (!draw) return showToast('Faça um sorteio primeiro!', 'error');
  championshipStore.quickDraft = { draw, format: 'knockout', halfDuration: 10 };
  // Abre modal de formato rápido
  document.getElementById('modal-root').innerHTML =
    renderQuickFormatModal(draw);
};

App.selectFormat = function(format) {
  championshipStore.quickDraft.format = format;
  document.querySelectorAll('.format-option').forEach(el => {
    el.classList.toggle('format-option--active', el.dataset.format === format);
  });
};

App.adjustHalfDuration = function(delta) {
  const current = championshipStore.quickDraft.halfDuration;
  const next    = Math.min(45, Math.max(5, current + delta));
  championshipStore.quickDraft.halfDuration = next;
  document.getElementById('halfDurationVal').textContent = next;
};

App.confirmQuickChampionship = function() {
  const { draw, format, halfDuration } = championshipStore.quickDraft;
  const name = document.getElementById('champName').value.trim()
    || suggestChampionshipName();

  const validation = validateFormatForTeamCount(format, draw.teams.length);
  if (!validation.valid) {
    showToast(validation.message, 'error');
    return;
  }

  const championship = createChampionshipFromDraw(draw, format, {
    matchConfig: {
      halves:       2,
      halfDuration,
      breakDuration: 5,
      extraTime:    false,
      penalties:    true,
    },
  });

  championship.name = name;
  saveChampionship(championship);

  App.closeModal();
  championshipStore.activeChampId = championship.id;
  setStep(4); // nova step: tela de preview dos times do campeonato
  render();
};

App.distributeReservesAuto = function() {
  const c        = _getActiveChampionship();
  const reserves = store.reserves;
  c.teams        = distributeReserves(c.teams, reserves);
  // Limpa reservas após distribuir
  store.reserves = [];
  saveChampionship(c);
  render();
};

App.assignReserve = function(playerId, teamId) {
  const c      = _getActiveChampionship();
  const player = store.reserves.find(p => p.id === playerId);
  const team   = c.teams.find(t => t.id === Number(teamId));
  if (!player || !team) return;
  team.players.push(player);
  store.reserves = store.reserves.filter(p => p.id !== playerId);
  saveChampionship(c);
  render();
};

App.startChampionship = function() {
  const id = championshipStore.activeChampId;
  startChampionship(id);
  showToast('Campeonato iniciado!');
  render();
};
```

---

## 11. Arquitetura de Arquivos Revisada

Adições específicas deste suplemento (não altera o que já foi documentado):

```
racha-facil/
└── src/
    ├── logic/
    │   └── drawToChampionship.js    ← 🆕 conversão draw→championship teams
    │                                    distributeReserves, createDrawSession
    │                                    suggestChampionshipName, validateFormatForTeamCount
    ├── utils/
    │   └── drawStorage.js           ← 🆕 CRUD do histórico de sorteios
    └── components/
        └── championships/
            ├── QuickFormatModal.js  ← 🆕 modal de criação rápida pós-sorteio
            └── DayTeamsPreview.js   ← 🆕 preview e edição dos times antes de iniciar
```

---

## 12. Guia de Implementação

Encaixar na ordem já definida nos documentos anteriores:

### Antes da Semana 1 — Fundação do sorteio

- [ ] Criar `drawStorage.js`
- [ ] Modificar `draw()` no `store.js` para salvar `DrawSession` após sorteio
- [ ] Verificar que `currentDrawId` está sendo persistido corretamente

### Durante a Semana 2 — Junto com a fase de grupos

- [ ] Criar `drawToChampionship.js` com `convertDrawToChampionshipTeams()` e `distributeReserves()`
- [ ] Criar `QuickFormatModal.js`
- [ ] Adicionar botão "🏆 Fazer Campeonato" na tela de times (step 3)
- [ ] Implementar `createChampionshipFromDraw()` no `championshipStore.js`
- [ ] Criar `DayTeamsPreview.js` com edição de nome/emoji/cor e distribuição de reservas
- [ ] Implementar `validateFormatForTeamCount()` com sugestão de formato

### Durante a Semana 3 — Junto com a transição

- [ ] Implementar aviso de re-sorteio com campeonato em setup
- [ ] Implementar `canEditTeamRoster()` e bloquear edição durante partidas ao vivo
- [ ] Suporte a campeonato misto (fixed + day teams) na tela de seleção

### Semana 5 — Polimento

- [ ] Histórico de sorteios (exibir últimos sorteios com link para o campeonato gerado)
- [ ] Indicador visual de origem do time (day/fixed/hybrid) no dashboard
- [ ] Exportar campeonato para WhatsApp com tabela de classificação + próximas partidas

---

## Resumo das Decisões

| Decisão | Escolha | Motivo |
|---|---|---|
| Times do sorteio são efêmeros? | ❌ Não — viram DrawSession | Sem persistência, campeonato perderia os dados ao re-sortear |
| DrawSession dura quanto tempo? | 7 dias, máx 10 sessões | Suficiente para um racha semanal sem lotar o localStorage |
| Re-sorteio com campeonato em andamento | Permitido, sem aviso | Campeonato tem snapshot — re-sorteio não afeta nada |
| Re-sorteio com campeonato em setup | Permitido, com aviso | Times em setup seriam perdidos sem aviso |
| Roster mutável após início? | Entre rodadas apenas | Impedir durante partidas ao vivo para consistência |
| Times mistos (fixed + day) | Suportado | Caso real: time da empresa + times gerados do dia |
| Campeonato com 2 times | Sugerido formato mata-mata | Pontos corridos com 2 times = 1 partida só, sem sentido |
| Distribuição de reservas | Manual (dropdown) + Auto (por estrelas) | Usuário pode querer controle, mas auto é conveniente |

---

*Suplemento 2 da championship-module.md — Racha Fácil v2.0*
*Integração Sorteio → Campeonato*
*Última atualização: Março 2026*
