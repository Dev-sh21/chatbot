document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadStatus = document.getElementById('upload-status');
    const statusText = document.getElementById('status-text');
    const docInfo = document.getElementById('doc-info');
    const docName = document.getElementById('doc-name');
    
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatContainer = document.getElementById('chat-container');
    
    let chatHistory = [];

    // --- File Upload Logic ---
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFileUpload(e.target.files[0]);
        }
    });

    async function handleFileUpload(file) {
        if (file.type !== 'application/pdf') {
            alert('Please upload a valid PDF document.');
            return;
        }

        dropZone.classList.add('hidden');
        uploadStatus.classList.remove('hidden');
        statusText.textContent = "Indexing document...";

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            
            if (response.ok) {
                uploadStatus.classList.add('hidden');
                docInfo.classList.remove('hidden');
                docName.textContent = `${file.name} (${data.chunks_indexed} chunks)`;
                addMessage(`Document **${file.name}** processed successfully. You can now ask questions!`, 'ai');
            } else {
                throw new Error(data.detail || "Failed to upload.");
            }
        } catch (error) {
            uploadStatus.classList.add('hidden');
            dropZone.classList.remove('hidden');
            alert(error.message);
        }
    }

    // --- Chat Logic ---
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = userInput.value.trim();
        if (!text) return;

        // Add user message
        addMessage(text, 'user');
        userInput.value = '';
        
        // Add loading indicator
        const loadingId = addTypingIndicator();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: text, history: chatHistory })
            });
            
            const data = await response.json();
            removeMessage(loadingId);
            
            if (response.ok) {
                let msgText = data.answer;
                
                // Add sources if available
                if (data.sources && data.sources.length > 0) {
                    const pages = [...new Set(data.sources.map(s => s.page))].join(", ");
                    msgText += `<br><br><span class="msg-source"><i class="fa-solid fa-book"></i> Source Pages: ${pages}</span>`;
                }

                addMessage(msgText, 'ai', true);
                
                // Update history
                chatHistory.push({ role: 'user', content: text });
                chatHistory.push({ role: 'assistant', content: data.answer });
            } else {
                addMessage(`Error: ${data.detail}`, 'ai');
            }
        } catch (error) {
            removeMessage(loadingId);
            addMessage(`Connection error: ${error.message}`, 'ai');
        }
    });

    function addMessage(text, sender, isHTML = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}-message`;
        
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.innerHTML = sender === 'ai' ? 'AI' : 'ME';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        if (isHTML) {
            content.innerHTML = text;
        } else {
            const p = document.createElement('p');
            p.textContent = text;
            content.appendChild(p);
        }

        msgDiv.appendChild(avatar);
        msgDiv.appendChild(content);
        
        chatContainer.appendChild(msgDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        return msgDiv;
    }

    function addTypingIndicator() {
        const id = 'typing-' + Date.now();
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ai-message`;
        msgDiv.id = id;
        
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.innerHTML = 'AI';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        content.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
        
        msgDiv.appendChild(avatar);
        msgDiv.appendChild(content);
        
        chatContainer.appendChild(msgDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        return id;
    }

    function removeMessage(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }
});
