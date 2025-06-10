# JWT Authentication System with Fastify

## ✅ Requisiti richiesti

Questa applicazione implementa un sistema di autenticazione basato su JWT, affrontando i seguenti casi:

- 🔐 Autenticazione con access token e refresh token
- 🔄 Refresh del token di accesso
- 🚪 Logout (revoca del singolo token)
- 🔑 Cambio password con invalidazione dei token attivi
- 👥 Cambio permessi utente
- 🧹 Revoca globale di tutti i token emessi prima di una certa data

## 🧪 Testing

Tutti i test sono scritti con [`tap`](https://www.node-tap.org/), includono casi end-to-end e sono eseguibili con:

```bash
npm install
npm test
```

Il file `auth-flow.test.ts` include test di:

- login e accesso a route protetta
- refresh del token
- logout
- cambio password (e invalidazione token)
- (estendibile con revoca globale e cambio permessi)

## ▶️ Avvio in modalità sviluppo

```bash
npm run dev
```

L'app sarà in ascolto su `http://localhost:3000`.

## 🛠 Mock DB

Il file `src/db/mockDB.ts` simula il comportamento di un database e conserva in memoria:

- Utenti
- Permessi
- Token attivi
- Timestamp di revoca globale (`revokedBefore`)

## 🧹 Linting

È configurato ESLint + Prettier:

```bash
npx eslint .
```

## 🧰 Tecnologie utilizzate

- Fastify
- @fastify/jwt
- Tap (testing)
- TypeScript
- Undici (`fetch` API)

## 📁 Struttura progetto

```
.
├── src/
│   ├── server.ts          # Definizione rotte e plugins
│   ├── start.ts           # Bootstrap dell'app Fastify
│   ├── db/mockDB.ts       # Mock DB per testing
│   └── types/             # Tipi estesi
├── tests/
│   └── auth-flow.test.ts  # Test end-to-end con Tap
├── .eslintrc.json
├── jest.config.js         # (Non usato - può essere rimosso)
├── package.json
└── tsconfig.json
```

## 📦 Note finali

Il progetto è pensato per essere facilmente estendibile verso un'implementazione reale usando un database come PostgreSQL, MongoDB o altri.
