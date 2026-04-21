import os
import faiss
import numpy as np
from typing import List, Tuple, Dict
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer, CrossEncoder
from langchain_core.documents import Document
import openai
from dotenv import load_dotenv

load_dotenv()

# Global state for models and index
class RAGPipeline:
    def __init__(self):
        print("Initializing models...")
        self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
        self.reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
        self.index = None
        self.chunks = []
        self.dimension = 384 # 'all-MiniLM-L6-v2' outputs 384 dims
        print("Models initialized!")
        
    def process_pdf(self, file_path: str) -> int:
        """Reads a PDF, splits it into chunks, and stores into a FAISS index."""
        # Read PDF manually with PyPDF instead of PyPDFLoader to avoid saving to temp paths if possible,
        # but PyPDFLoader requires file path anyway. We'll use file path.
        from langchain_community.document_loaders import PyPDFLoader
        loader = PyPDFLoader(file_path)
        documents = loader.load()
        
        # Split text
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=100
        )
        self.chunks = text_splitter.split_documents(documents)
        print(f"Total chunks created: {len(self.chunks)}")
        
        if not self.chunks:
            return 0
            
        # Create vectors
        embeddings = self.encoder.encode([chunk.page_content for chunk in self.chunks])
        
        # Initialize FAISS index
        self.index = faiss.IndexFlatL2(self.dimension)
        self.index.add(np.array(embeddings))
        
        return len(self.chunks)

    def query(self, user_query: str, conversation_history: List[Dict[str, str]] = None) -> Tuple[str, List[Dict]]:
        """Given a query and conversation history, retrieve context, rerank and generate response."""
        if conversation_history is None:
            conversation_history = []
            
        if not self.index or len(self.chunks) == 0:
            return "No documents indexed. Please upload a document first.", []
            
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            return "Please provide an OpenRouter API Key in the .env file.", []
            
        client = openai.OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )
        model_name = "google/gemini-2.5-flash" # Efficient model for RAG
        
        # Retrieval
        query_embedding = self.encoder.encode([user_query])
        D, I = self.index.search(np.array(query_embedding), k=5)
        
        retrieved_chunks = [self.chunks[i] for i in I[0] if i < len(self.chunks)]
        
        if not retrieved_chunks:
            return "I couldn't find relevant information in the documents.", []
            
        # Rerank
        pairs = [(user_query, chunk.page_content) for chunk in retrieved_chunks]
        scores = self.reranker.predict(pairs)
        ranked_chunks = sorted(
            zip(scores, retrieved_chunks),
            key=lambda x: x[0],
            reverse=True
        )
        
        # Context
        top_chunks = [chunk.page_content for _, chunk in ranked_chunks[:3]]
        context = "\n\n".join(top_chunks)
        
        sources = [
            {"page": chunk.metadata.get("page", "Unknown")}
            for _, chunk in ranked_chunks[:3]
        ]
        
        # Build prompt for Gemini as it takes a plain string text or list of dicts.
        # It's safest to construct a single prompt with history.
        formatted_history = ""
        for msg in conversation_history:
            formatted_history += f"{'User' if msg['role'] == 'user' else 'AI'}: {msg['content']}\n"
            
        current_prompt = f"""
Answer the question using the context below. Keep your answer concise.

Context:
{context}

Conversation History:
{formatted_history}

Question:
{user_query}
"""
        
        # Generate answer with OpenRouter
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": current_prompt}],
                max_tokens=1000,
                extra_headers={
                    "HTTP-Referer": "http://localhost:8000", # Optional, for OpenRouter analytics
                    "X-Title": "Mission-Critical Chatbot", # Optional
                }
            )
            answer = response.choices[0].message.content
            return answer, sources
        except Exception as e:
            return f"Error connecting to OpenRouter: {str(e)}", []
            
rag = RAGPipeline()
# Trigger reload
