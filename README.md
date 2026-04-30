# BioC - 智能生物竞赛学习平台

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/uniniconn/bioc-competition-system)

BioC 是一个专为生物竞赛学子设计的智能化学习与知识管理平台。基于 Cloudflare 生态构建，提供高性能、低延迟的全球访问体验。

## ✨ 核心特性

- **📸 智能 OCR 识图录入**：通过 OCR.space 技术，一键将题目图片转化为结构化文字，极大提升录入效率。
- **🤖 AI 智能批改与评估**：对接 DeepSeek V3 大模型，实现对答题内容的深度解析与智能化评分。
- **📚 结构化知识管理**：支持知识点关联、难度分级、标签分类，构建个人及竞赛知识图谱。
- **📝 知识总结生成**：利用 AI 自动提炼章节要点，生成高质量的学习总结。
- **🏆 荣誉竞逐榜单**：动态积分系统，记录学子的成长足迹，激发学习动力。
- **🎂 温情关怀系统**：内置生日祝福功能，为备赛之路增添一丝暖意。
- **🎨 多维设计美学**：内置多种精美主题切换（科技、经典、柔和、梦幻），打造极致视觉体验。

## 🛡️ 安全与权限

- **初次访客授权**：系统采用“首位登入者即管理员”逻辑。网站部署后的第一个登录用户将自动获得系统管理员权限。
- **API 密钥动态管理**：支持在管理后台动态修改 DeepSeek 和 OCR.space 的 API 密钥，无需重新部署代码。
- **操作权限控制**：核心增删改操作均经过严格的 UID 校验与角色权限验证，确保数据安全。

## 🚀 极速部署 (Cloudflare Pages)

本项目已完成底层适配，支持 **一键全自动化部署**。

### 自动化流程说明：
1. **自动 Fork**：系统会将仓库 Fork 到您的 GitHub 账号。
2. **自动建库**：自动创建名为 `bioc-db` 的 D1 数据库。
3. **自动初始化**：自动执行 `migrations` 目录下的 SQL 文件完成建表（无需手动敲命令）。
4. **自动绑定**：自动完成 Pages 项目与数据库的变量绑定。

### 手动部署 (可选)
如果需要手动微调，请参考：
1. 确保已安装 Node.js 和 Wrangler。
2. 运行 `npx wrangler d1 migrations apply bioc-db --remote` 初始化数据库。
3. 在 Cloudflare Pages 后台绑定 D1 数据库，变量名为 `DB`。

## 🛠️ 技术栈

- **前端**：React 18 + Vite + Tailwind CSS + Lucide Icons + Framer Motion
- **后端**：Cloudflare Pages Functions (Edge Runtime)
- **数据库**：Cloudflare D1 (SQLite)
- **AI 引擎**：DeepSeek (通过 API 动态对接)
- **OCR 引擎**：OCR.space

---

*由 BioC 团队驱动 - 为生物竞赛而生*
