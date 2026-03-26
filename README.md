# ⚽ Racha Fácil

Sorteio inteligente e balanceado de times de futebol para peladas e rachas.
Roda direto no navegador. Dados sincronizados via Firebase (opcional).

---

## Funcionalidades

- **Cadastro de jogadores** com nome, posição e nível de 1–5 estrelas
- **Copiar/colar lista** de jogadores por texto
- **Algoritmo Snake Draft** para balanceamento automático dos times
- **Cabeça de chave** — jogadores fixados para equilibrar o sorteio
- **Indicador de equilíbrio** visual (Excelente / Bom / Regular / Desnivelado)
- **Modo de troca manual** — toque dois jogadores para trocar entre times
- **Troca com reservas** — substitua qualquer jogador por um reserva
- **Desfazer** a última troca
- **Goleiros** — atribuição por time ou em rodízio
- **Timer de partida** configurável, com alerta sonoro
- **Modo campeonato** — round-robin ou fase de grupos + mata-mata
- **Histórico de sorteios** — veja e recarregue sorteios anteriores
- **Exportar para WhatsApp** com nome, posição e estrelas de cada time
- **Perfil e sincronização** — login Google para sincronizar jogadores e histórico entre dispositivos
- **Persistência local** — dados salvos no navegador (localStorage) mesmo sem login
- **Campo interativo** — visualização dos jogadores posicionados no campo antes do sorteio

---

## Estrutura do projeto

```
racha-facil/
├── index.html                      # Entry point HTML
├── README.md
├── assets/
│   └── css/
│       └── style.css               # Stylesheet global
└── src/
    ├── app.js                      # Entry point JS — renderização e API pública (window.App)
    ├── version.js                  # Versão do app (APP_VERSION)
    ├── data/
    │   └── constants.js            # Posições, nomes e cores dos times
    ├── state/
    │   └── store.js                # Estado global + todas as actions
    ├── logic/
    │   ├── balance.js              # Snake draft, média, score de equilíbrio
    │   └── championship.js         # Lógica de campeonato (standings, confrontos)
    ├── firebase/
    │   ├── config.js               # Configuração do Firebase
    │   ├── auth.js                 # Autenticação Google
    │   └── db.js                   # Sincronização Firestore
    ├── components/
    │   ├── header.js               # Cabeçalho do app
    │   ├── bottomnav.js            # Barra de navegação inferior
    │   ├── players.js              # Tela de cadastro de jogadores
    │   ├── config.js               # Tela de configuração do sorteio
    │   ├── drawing.js              # Animação de sorteio
    │   ├── teams.js                # Tela de times + swap + reservas
    │   ├── timer.js                # Timer de partida
    │   ├── championship.js         # Tela de campeonato
    │   ├── history.js              # Tela de histórico de sorteios
    │   └── profile.js              # Tela de perfil e autenticação
    └── utils/
        ├── helpers.js              # escHtml, starsDisplay, posIcon, posLabel
        ├── storage.js              # Wrapper do localStorage
        ├── toast.js                # Sistema de notificações (toast)
        └── morph.js                # Utilitário de transição de elementos
```

---

## Como usar

### Desenvolvimento local

Abra com qualquer servidor HTTP local (necessário por causa dos ES Modules):

```bash
# Python (built-in)
python3 -m http.server 3000

# Node.js (npx)
npx serve .

# VS Code
# Instale a extensão "Live Server" e clique em "Go Live"
```

Acesse `http://localhost:3000` no navegador.

> ⚠️ **Não abra o `index.html` diretamente** (protocolo `file://`) — os ES Modules não funcionam sem um servidor HTTP.

---

## Algoritmo de balanceamento

O app usa **Snake Draft**:

1. Ordena todos os jogadores do maior para o menor nível
2. Distribui em zigue-zague entre os times:
   - Time A → Time B → Time C → Time C → Time B → Time A → …
3. Jogadores excedentes vão para a lista de Reservas

Esse padrão garante que cada time receba um jogador forte, um médio e um fraco de forma alternada, resultando em médias muito próximas.

**Cabeça de chave:** jogadores marcados como cabeça de chave são distribuídos primeiro (um por time) antes do snake draft, garantindo que times recebam âncoras equilibradas.

---

## Fluxo de telas

```
[Jogadores]  →  [Configurar]  →  [Sorteando…]  →  [Times]
   Cadastro       Nº por time     Animação         Ver + Ajustar

[Campeonato]  →  Tabela / Confrontos / Campeão
[Histórico]   →  Sorteios anteriores → Ver times de um sorteio
[Perfil]      →  Login Google, sincronização, configurações padrão
```

---

## Tecnologias

| Camada       | Tecnologia                                      |
|--------------|-------------------------------------------------|
| Markup       | HTML5 semântico                                 |
| Estilo       | CSS3 customizado (sem framework)                |
| Lógica       | JavaScript ES2022 (ES Modules)                  |
| Fontes       | Google Fonts (Barlow Condensed + Outfit)        |
| Persistência | localStorage + Firestore (Firebase)             |
| Auth         | Firebase Authentication (Google Sign-In)        |
| Deploy       | Qualquer servidor estático                      |

---

## Deploy (produção)

O projeto é estático no front-end. Faça upload da pasta para qualquer host estático:

- **GitHub Pages** — push para a branch `gh-pages`
- **Netlify** — drag & drop da pasta no painel
- **Vercel** — `vercel --prod` na raiz do projeto
- **Qualquer CDN** — sirva os arquivos como estáticos

Configure as variáveis do Firebase em `src/firebase/config.js` com as credenciais do seu projeto.

---

Desenvolvido com ❤️ para o racha do fim de semana.
