# Pregador OS

> O primeiro sistema operacional para pregadores. Estude, prepare, ministre — tudo em uma única plataforma.

Inspirado em **Notion**, **Apple Notes**, **Craft Docs**, **Obsidian** e **Kindle**, adaptado para o universo da pregação.

## O que é

Pregador OS não é um app de sermões. É um sistema operacional ministerial: o objeto central é a **Mensagem** — uma estrutura rica com tema, texto-base, objetivo, público, versículos, aplicações, ilustrações, anexos e histórico. Tudo orbita ela: biblioteca, busca, IA contextual, modo púlpito, análise.

## Stack

- **React 19 + Vite + TypeScript** — base
- **Tailwind CSS** — design system premium (Notion / Apple Notes vibe)
- **Dexie.js (IndexedDB)** — offline-first, instantâneo
- **Tiptap** — editor extensível (com marcador inteligente)
- **Zustand** — estado leve
- **React Router 7** — navegação
- **Framer Motion** — animações sutis
- **Lucide React** — ícones
- **Dexie React Hooks** — reatividade live

## Funcionalidades (Onda 1 — MVP)

- **Biblioteca** com filtros (tema, livro, série, status) e agrupamentos
- **Editor** com sidebar de metadados + dois editores ricos (esboço + mensagem completa)
- **IA contextual** com 7 ações (esboço, ilustrações, aplicações, cruzamentos, perguntas, contexto, resumo)
- **Modo Púlpito** fullscreen com cronômetro, relógio, marcador inteligente (vermelho suave 50%, arrastar pra marcar várias linhas, marcações somem após ministração)
- **Busca universal** com Ctrl/⌘+K — versículos, temas, ilustrações, tudo
- **Analista de Sermões** com checklist estrutural e alertas
- **Histórico de versões** automático (até 50 por mensagem)
- **Exportar / Importar** backup JSON
- **Offline-first** — tudo roda sem internet, abre instantâneo

## Como rodar

```bash
npm install
npm run dev      # http://localhost:8080
npm run build    # build de produção
npm run preview  # preview do build
```

## Roadmap

- **Onda 2** — Busca universal avançada, Analista com IA real (LLM via Supabase Edge Functions), Modo Estudo (personagens, mapas, cronologias, Hebraico/Grego), sincronização multi-device
- **Onda 3** — Séries conectadas, performance tuning, PWA instalável, sincronização delta

## Filosofia

> Cada elemento da interface deve possuir uma razão para existir.
> Se uma funcionalidade não facilita a vida do pregador, ela deve ser removida.

---

Desenvolvido com foco. Para o serviço da Palavra.