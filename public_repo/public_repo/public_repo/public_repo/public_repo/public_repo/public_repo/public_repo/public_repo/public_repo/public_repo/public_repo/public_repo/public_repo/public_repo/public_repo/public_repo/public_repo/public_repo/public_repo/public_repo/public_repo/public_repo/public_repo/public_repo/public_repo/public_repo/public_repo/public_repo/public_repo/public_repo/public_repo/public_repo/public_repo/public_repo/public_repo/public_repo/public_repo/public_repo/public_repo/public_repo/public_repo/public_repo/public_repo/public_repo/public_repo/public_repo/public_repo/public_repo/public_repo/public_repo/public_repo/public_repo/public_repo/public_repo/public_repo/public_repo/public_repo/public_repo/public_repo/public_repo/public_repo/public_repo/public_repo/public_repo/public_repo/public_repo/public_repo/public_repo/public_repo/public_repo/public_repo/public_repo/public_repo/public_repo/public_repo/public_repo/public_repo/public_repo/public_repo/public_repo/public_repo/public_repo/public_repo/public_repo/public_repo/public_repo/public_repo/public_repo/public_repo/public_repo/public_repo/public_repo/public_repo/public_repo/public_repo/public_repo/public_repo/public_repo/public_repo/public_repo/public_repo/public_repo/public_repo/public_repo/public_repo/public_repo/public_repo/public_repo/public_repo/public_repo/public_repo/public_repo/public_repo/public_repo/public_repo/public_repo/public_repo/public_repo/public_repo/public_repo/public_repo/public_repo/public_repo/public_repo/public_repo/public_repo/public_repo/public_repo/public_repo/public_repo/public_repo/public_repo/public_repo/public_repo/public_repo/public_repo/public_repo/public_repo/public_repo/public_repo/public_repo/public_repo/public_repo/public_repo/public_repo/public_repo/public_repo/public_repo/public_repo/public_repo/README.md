# 知壑 (WisVale)

知壑 (WisVale) 是一款专为全国中学生生物学联赛、全国中学生生物学竞赛 (CNBO) 打造的全栈 Web 应用。它旨在帮助生物学竞赛生高效地管理、整理和练习生物学题目，通过智能化的工具辅助学习。

本项目的大部分代码由 Google Gemini 辅助编写完成。欢迎将这个网站转换成适应其他学科的版本。

---

# Biology Question Manager (WisVale)

A full-stack web application designed to help biology students and educators manage, organize, and practice with biology questions, specifically tailored for the National Biology Olympiad (CNBO).

## Features

- **OCR Question Upload**: Easily upload images of biology questions to extract text automatically.
- **AI-Powered Analysis**: Uses DeepSeek AI to clean up OCR text, format questions, and extract key knowledge points.
- **Duplicate Detection**: Intelligent duplicate question detection using Levenshtein distance to ensure a unique question database.
- **Knowledge Base**: Organize and track mastery of biology knowledge points.
- **Answer Evaluation**: AI-based evaluation of user answers against standard knowledge points.
- **Gamification**: Track tokens used and award points for contributions.

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide React, Framer Motion
- **Backend**: Node.js, Express
- **Database**: Firebase Firestore
- **AI/OCR Services**: DeepSeek API, OCR.space API

## Deployment

### Prerequisites

- Node.js (v18+)
- Firebase Project
- API Keys:
  - [OCR.space API Key](https://ocr.space/ocrapi)
  - [DeepSeek API Key](https://platform.deepseek.com/)

### Setup

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd <your-repo-folder>
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add your API keys:
   ```env
   OCR_SPACE_API_KEY=your_ocr_space_api_key
   DEEPSEEK_API_KEY=your_deepseek_api_key
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
   VITE_FIREBASE_APP_ID=your_firebase_app_id
   VITE_FIREBASE_FIRESTORE_DATABASE_ID=your_firebase_database_id
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```
