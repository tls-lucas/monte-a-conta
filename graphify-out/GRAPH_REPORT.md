# Graph Report - monte-a-conta  (2026-09-15)

## Corpus Check
- Corpus is ~10,759 words - fits in a single context window. You may not need a graph.

## Summary
- 208 nodes · 351 edges · 18 communities (15 shown, 2 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App Shell & Appearance Panel
- Internal App Orchestration
- Root Package Config
- Money Counting Phase
- Counting Phase & Validation
- Config Panel & Phase Generator
- Expo App Manifest
- Counting Generator & Emoji Theme
- Statistics Panel & Email Report
- NPM Dependencies
- Flask Backend API
- Phase Trail / Level Map
- Expo Dev Session Metadata
- Answer Validator
- Backend Python Dependencies
- PDF & Email Libraries
- Expo Dev Builds Doc

## God Nodes (most connected - your core abstractions)
1. `AppInterno()` - 19 edges
2. `FaseContagem()` - 15 edges
3. `registrarTempo()` - 12 edges
4. `FaseDinheiro()` - 11 edges
5. `useAparencia()` - 11 edges
6. `expo` - 10 edges
7. `react` - 10 edges
8. `react-native` - 9 edges
9. `PainelEstatisticas()` - 6 edges
10. `Peca()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `AppInterno()` --calls--> `useAparencia()`  [EXTRACTED]
  App.js → src/contexto/AparenciaContext.js
- `AppInterno()` --calls--> `gerarFase()`  [EXTRACTED]
  App.js → src/utils/faseGenerator.js
- `AppInterno()` --calls--> `contaEstaCorreta()`  [EXTRACTED]
  App.js → src/utils/validador.js
- `criarNovaFase()` --calls--> `gerarFase()`  [EXTRACTED]
  App.js → src/utils/faseGenerator.js
- `AppInterno()` --calls--> `calcularResumo()`  [EXTRACTED]
  App.js → src/utils/estatisticas.js

## Import Cycles
- None detected.

## Communities (18 total, 2 thin omitted)

### Community 0 - "App Shell & Appearance Panel"
Cohesion: 0.10
Nodes (27): formatarTempo(), posicaoAleatoriaSemSobrepor(), styles, react, react-native, ROTULO_OPERACAO, SIMBOLO_OPERACAO, styles (+19 more)

### Community 1 - "Internal App Orchestration"
Cohesion: 0.21
Nodes (16): AppInterno(), atualizarResumoEstatisticas(), cancelarConfirmacao(), criarNovaFase(), finalizarFase(), gerarNovaFaseComConfigAtual(), iniciarConfirmacao(), reiniciarPosicoes() (+8 more)

### Community 2 - "Root Package Config"
Cohesion: 0.12
Nodes (16): devDependencies, concurrently, main, name, private, scripts, android, ios (+8 more)

### Community 3 - "Money Counting Phase"
Cohesion: 0.17
Nodes (13): expo-speech, expo-status-bar, FaseDinheiro(), adicionarCedula(), finalizarFase(), iniciarNovaFase(), formatarTempo(), NOTAS_INFO (+5 more)

### Community 4 - "Counting Phase & Validation"
Cohesion: 0.16
Nodes (12): FaseContagem(), cancelarConfirmacao(), finalizarFase(), gerarNovaFaseAgora(), iniciarConfirmacao(), novaFase(), formatarTempo(), posicaoAleatoriaSemSobrepor() (+4 more)

### Community 5 - "Config Panel & Phase Generator"
Cohesion: 0.18
Nodes (13): PainelConfig(), styles, blocosDoNumero(), GERADORES, gerarDivisao(), gerarFase(), gerarMultiplicacao(), gerarSoma() (+5 more)

### Community 6 - "Expo App Manifest"
Cohesion: 0.13
Nodes (14): backgroundColor, adaptiveIcon, expo, android, assetBundlePatterns, ios, name, orientation (+6 more)

### Community 7 - "Counting Generator & Emoji Theme"
Cohesion: 0.23
Nodes (12): blocosDeEmoji(), blocosDoNumero(), GERADORES, gerarFaseContagem(), gerarNenhuma(), gerarSoma(), gerarSubtracao(), OPERACOES (+4 more)

### Community 8 - "Statistics Panel & Email Report"
Cohesion: 0.24
Nodes (11): @react-native-async-storage/async-storage, formatarTempo(), PainelEstatisticas(), enviar(), styles, API_URL, carregarUltimoEmailRelatorio(), EMAIL_RELATORIO_KEY (+3 more)

### Community 9 - "NPM Dependencies"
Cohesion: 0.20
Nodes (10): dependencies, expo, @expo/metro-runtime, expo-speech, expo-status-bar, react, react-dom, react-native (+2 more)

### Community 10 - "Flask Backend API"
Cohesion: 0.36
Nodes (8): formatar_tempo(), gerar_pdf(), health(), inicio(), relatorio_email(), relatorio_pdf(), get, post

### Community 11 - "Phase Trail / Level Map"
Cohesion: 0.25
Nodes (7): CORES, FASES, NIVEIS, obterStatusFases(), OPERACOES, styles, TrilhaFases()

### Community 12 - "Expo Dev Session Metadata"
Cohesion: 0.40
Nodes (5): Development sessions feature, devices.json, Expo .expo folder, application manifest, settings.json

### Community 13 - "Answer Validator"
Cohesion: 0.67
Nodes (3): contaEstaCorreta(), montarTokens(), OPERACOES

### Community 14 - "Backend Python Dependencies"
Cohesion: 0.67
Nodes (3): Flask, flask-cors, python-dotenv

## Knowledge Gaps
- **75 isolated node(s):** `styles`, `name`, `slug`, `version`, `orientation` (+70 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 91 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `App Shell & Appearance Panel` to `Root Package Config`, `Money Counting Phase`, `Config Panel & Phase Generator`, `Statistics Panel & Email Report`, `Phase Trail / Level Map`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `dependencies` connect `NPM Dependencies` to `Root Package Config`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `react-native` connect `App Shell & Appearance Panel` to `Root Package Config`, `Money Counting Phase`, `Config Panel & Phase Generator`, `Statistics Panel & Email Report`, `Phase Trail / Level Map`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **What connects `styles`, `name`, `slug` to the rest of the system?**
  _75 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell & Appearance Panel` be split into smaller, more focused modules?**
  _Cohesion score 0.09747899159663866 - nodes in this community are weakly interconnected._
- **Should `Root Package Config` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `Expo App Manifest` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._