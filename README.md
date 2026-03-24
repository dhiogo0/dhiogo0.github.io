# ⚽ Racha Fácil

Sorteio inteligente e balanceado de times de futebol para peladas e rachas.  
Roda direto no navegador, sem backend, sem instalação.

---

## Funcionalidades

- **Cadastro de jogadores** com nome, posição e nível de 1–5 estrelas
- **Algoritmo Snake Draft** para balanceamento automático dos times
- **Indicador de equilíbrio** visual (Excelente / Bom / Regular / Desnivelado)
- **Modo de troca manual** — toque dois jogadores para trocar entre times
- **Troca com reservas** — substitua qualquer jogador por um reserva
- **Desfazer** a última troca
- **Exportar para WhatsApp** com nome, posição e estrelas de cada time
- **Persistência local** — jogadores salvos no navegador (localStorage)
- **Animação de sorteio** antes de revelar os times

---

## Estrutura do projeto

```
racha-facil/
├── index.html                  # Entry point HTML
├── README.md
├── assets/
│   └── css/
│       └── style.css           # Stylesheet global
└── src/
    ├── app.js                  # Entry point JS — renderização e API pública (window.App)
    ├── data/
    │   └── constants.js        # Posições, nomes e cores dos times
    ├── state/
    │   └── store.js            # Estado global + todas as actions
    ├── logic/
    │   └── balance.js          # Snake draft, média, score de equilíbrio
    ├── components/
    │   ├── header.js           # Cabeçalho do app
    │   ├── tabs.js             # Barra de navegação
    │   ├── players.js          # Tela de cadastro de jogadores
    │   ├── config.js           # Tela de configuração do sorteio
    │   ├── drawing.js          # Animação de sorteio
    │   └── teams.js            # Tela de times + swap + reservas
    └── utils/
        ├── helpers.js          # escHtml, starsDisplay, posIcon, posLabel
        ├── storage.js          # Wrapper do localStorage
        └── toast.js            # Sistema de notificações (toast)
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

---

## Fluxo de telas

```
[Jogadores]  →  [Configurar]  →  [Sorteando…]  →  [Times]
   Cadastro       Nº por time     Animação         Ver + Ajustar
```

---

## Tecnologias

| Camada     | Tecnologia                       |
|------------|----------------------------------|
| Markup     | HTML5 semântico                  |
| Estilo     | CSS3 customizado (sem framework) |
| Lógica     | JavaScript ES2022 (ES Modules)   |
| Fontes     | Google Fonts (Barlow Condensed + Outfit) |
| Persistência | localStorage                   |
| Deploy     | Qualquer servidor estático       |

---

## Deploy (produção)

O projeto é 100% estático. Faça upload da pasta para qualquer host estático:

- **GitHub Pages** — push para a branch `gh-pages`
- **Netlify** — drag & drop da pasta no painel
- **Vercel** — `vercel --prod` na raiz do projeto
- **Qualquer CDN** — sirva os arquivos como estáticos

---

Desenvolvido com ❤️ para o racha do fim de semana.
