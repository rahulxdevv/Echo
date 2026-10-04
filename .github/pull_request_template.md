## 📌 Pull Request Description

Please provide a detailed summary of the changes proposed in this PR.

---

### 🏷️ Type of Change
- [ ] 🐛 **Bug fix** (non-breaking change fixing an issue)
- [ ] ✨ **New feature** (non-breaking change adding functionality)
- [ ] ⚡ **Performance improvement**
- [ ] 🎨 **UI / Components V2 design update**
- [ ] 📝 **Documentation update**
- [ ] 🧹 **Refactoring / Code cleanup**

---

### 🔍 What was Added or Fixed?
<!-- Explain what was changed, which commands or systems are affected, and why this change was needed -->

- 
- 

---

### 🧪 How Was This Tested?
<!-- Describe the tests or manual verification you performed to ensure code logic works -->

- [ ] Ran `npm test` locally and all 300+ automated test checks passed.
- [ ] Tested in a live Discord server / DM using slash commands.
- [ ] Tested prefix commands (`!command`) to ensure parity.

---

### ✅ Contributor Checklist

- [ ] My code adheres to the project's **Discord Components V2** standard (`ContainerBuilder`, `TextDisplayBuilder`, etc. — **no `EmbedBuilder`**).
- [ ] Both **slash command (`executeSlash`)** and **prefix command (`executePrefix`)** handlers are implemented (or explicitly marked `slashOnly: true`).
- [ ] All new files export the required properties (`name`, `category`, `description`, `data`, `executeSlash`).
- [ ] I have not committed any personal secrets, bot tokens, or `.env` files.
- [ ] My changes pass all automated checks with zero errors (`npm test`).
