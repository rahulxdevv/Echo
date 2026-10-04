# Contributing to Echo 🚀

Thank you for your interest in contributing to **Echo**! Whether you want to report a bug, suggest an enhancement, or submit a pull request for a new feature, this guide will help you get started.

---

## Table of Contents
1. [Code of Conduct & Guidelines](#code-of-conduct--guidelines)
2. [Getting Started](#getting-started)
3. [Architecture & Coding Standards](#architecture--coding-standards)
   - [Discord Components V2 Standard](#discord-components-v2-standard)
   - [Prefix & Slash Command Parity](#prefix--slash-command-parity)
   - [Command File Structure](#command-file-structure)
4. [Running Automated Tests](#running-automated-tests)
5. [Pull Request Workflow](#pull-request-workflow)
6. [License Agreement](#license-agreement)

---

## Code of Conduct & Guidelines

- **Respect others**: Be welcoming, polite, and constructive in all issues and pull requests.
- **Keep it clean**: Do not commit sensitive data (bot tokens, MongoDB credentials, `.env` files).
- **Follow conventions**: Adhere to the existing code style, folder organization, and naming patterns.

---

## Getting Started

1. **Fork the repository** on GitHub: [https://github.com/rahulxdevv/Echo](https://github.com/rahulxdevv/Echo)
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Echo.git
   cd Echo
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Configure environment**:
   Copy `.env.example` to `.env` and fill in your test bot credentials:
   ```bash
   cp .env.example .env
   ```
5. **Run the bot in development mode**:
   ```bash
   npm run dev
   ```

---

## Architecture & Coding Standards

### Discord Components V2 Standard

Echo **exclusively** uses Discord's new **Components V2** interface.

- ❌ **Prohibited**: Plain embeds (`new EmbedBuilder()`, `.setEmbeds()`).
- ✅ **Required**: Use `ContainerBuilder`, `TextDisplayBuilder`, `SeparatorBuilder`, `SectionBuilder` with `ThumbnailBuilder`, and `MediaGalleryBuilder`.
- Use the built-in helpers in `src/utils/respond.js`:
  ```javascript
  const { replyError, replySuccess, replyWithCard } = require('../../utils/respond');

  // Fast error response
  await replyError(interaction, 'Something went wrong.');

  // Custom container response
  await replyWithCard(interaction, '# Title\n\nBody content goes here.');
  ```

### Prefix & Slash Command Parity

Unless a command is fundamentally unsuited for text messages (e.g. requires modals), **every command must support both Slash and Prefix execution**:
- Slash commands are handled by `executeSlash(interaction, client)`.
- Prefix commands are handled by `executePrefix(message, args, client)`.
- If a command is strictly slash-only, declare `slashOnly: true`.

### Command File Structure

Place new commands in the appropriate directory inside `src/commands/<category>/<command>.js`:

```javascript
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { replyError, replyWithCard } = require('../../utils/respond');

module.exports = {
  category: 'Utility',
  name: 'example',
  description: 'An example command description',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('example')
    .setDescription('An example command description'),

  async executePrefix(message, args, client) {
    // Prefix logic
    await replyWithCard(message, '# Example\n\nPrefix command executed!');
  },

  async executeSlash(interaction, client) {
    // Slash logic
    await replyWithCard(interaction, '# Example\n\nSlash command executed!');
  }
};
```

---

## Running Automated Tests

Echo has an **automated test suite** that validates:
1. JavaScript syntax & compilation across all source files.
2. Command definitions, slash command builders, parity, and name matching.
3. Strict Components V2 compliance (flags and rejects any `EmbedBuilder`).
4. Event listeners and Mongoose database model schemas.
5. Utility module integrity.
6. Secret scanning (prevents accidental leaks of bot tokens or MongoDB credentials).

Before pushing your changes or opening a PR, always run:

```bash
npm test
```

> **Note**: GitHub Actions automatically runs `npm test` on every pull request. PRs with failing checks cannot be merged.

---

## Pull Request Workflow

1. Create a descriptive feature branch:
   ```bash
   git checkout -b feat/my-new-feature
   # or
   git checkout -b fix/issue-description
   ```
2. Commit your changes with clear, descriptive commit messages:
   ```bash
   git commit -m "feat(giveaway): add reminder notification before giveaway ends"
   ```
3. Run tests locally to ensure 100% pass rate:
   ```bash
   npm test
   ```
4. Push your branch to your fork:
   ```bash
   git push origin feat/my-new-feature
   ```
5. Open a Pull Request on GitHub against the `main` branch.
6. Complete the **Pull Request Template** checklist so the maintainers know exactly what you changed and how you verified it.

---

## License Agreement

By contributing to **Echo**, you agree that your contributions will be licensed under the project's [Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](LICENSE) license.
