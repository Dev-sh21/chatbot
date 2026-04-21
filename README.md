# Secure Knowledge-Driven AI Framework

A high-performance Retrieval-Augmented Generation (RAG) chatbot built with **FastAPI**, **LangChain**, and **FAISS**. This system allows users to upload PDF documents and engage in context-aware conversations based on the uploaded data.

## Features

- **PDF Ingestion**: Seamlessly upload and index PDF documents.
- **RAG Pipeline**: Advanced retrieval using LangChain and FAISS for efficient semantic search.
- **Real-time Chat**: Interactive web-based chat interface.
- **Source Attribution**: See exactly which parts of your documents were used to generate answers.
- **FastAPI Backend**: Robust, typed, and fast API endpoints.

## Tech Stack

- **Backend**: FastAPI, Python
- **LLM/RAG**: LangChain, OpenAI, Sentence-Transformers
- **Vector Database**: FAISS
- **Frontend**: Vanilla JS, HTML, CSS (served via FastAPI)

## Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd chatbot
   ```

2. **Install dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add your API keys:
   ```env
   OPENAI_API_KEY=your_key_here
   ```

4. **Run the application**:
   ```bash
   uvicorn backend.main:app --reload
   ```

5. **Access the Chatbot**:
   Open your browser and navigate to `http://localhost:8000`

## Security

This project is designed with security in mind. Ensure that your `.env` file is never committed to version control (already included in `.gitignore`).
