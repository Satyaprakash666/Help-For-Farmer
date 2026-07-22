window.onload = function () {
    const container = document.getElementById('tool-container');
    const loadingContainer = document.createElement('div');
    loadingContainer.className = 'loading-container';
    loadingContainer.innerHTML = `
        <div class="spinner"></div>
        <p>Loading tools information...</p>
    `;
    container.appendChild(loadingContainer);
    loadingContainer.style.display = 'block';
    
    // LINK HERE
    // fetch('/get-tools')
    fetch(`${rootUrl}/get-tools`)
        .then(response => response.json())
        .then(data => {
            loadingContainer.style.display = 'none';
            container.innerHTML = "";

            if (!data.tools || data.tools.length === 0) {
                container.innerHTML = '<p class="message">No tools uploaded yet.</p>';
                return;
            }

            data.tools.forEach(tool => {
                const toolCard = document.createElement('div');
                toolCard.className = 'tool-card';
                
                const img = document.createElement('img');
                img.src = tool.image;
                img.alt = tool.title;
                
                const content = document.createElement('div');
                content.className = 'content';
                
                const title = document.createElement('h3');
                title.textContent = tool.title;
                
                // const description = document.createElement('p');
                // description.textContent = tool.description;
                const description = document.createElement('p');
                description.textContent = tool.description;
                description.style.whiteSpace = 'pre-wrap';
                
                const readMoreBtn = document.createElement('button');
                readMoreBtn.className = 'read-more-btn';
                readMoreBtn.textContent = 'Read More';
                readMoreBtn.style.display = 'none'; 
                
                if (tool.link && tool.link !== 'no-link') {
                    const buyNowBtn = document.createElement('a');
                    buyNowBtn.href = tool.link;
                    buyNowBtn.target = '_blank';
                    buyNowBtn.className = 'buy-now-btn';
                    buyNowBtn.textContent = 'Buy Now';
                    content.appendChild(buyNowBtn);
                }
                
                readMoreBtn.addEventListener('click', () => {
                    if (description.classList.contains('expanded')) {
                        description.classList.remove('expanded');
                        readMoreBtn.textContent = 'Read More';
                    } else {
                        description.classList.add('expanded');
                        readMoreBtn.textContent = 'Show Less';
                    }
                });
                
                content.appendChild(title);
                content.appendChild(description);
                content.appendChild(readMoreBtn);
                
                toolCard.appendChild(img);
                toolCard.appendChild(content);
                
                setTimeout(() => {
                    if (description.scrollHeight > description.clientHeight) {
                        readMoreBtn.style.display = 'block';
                    }
                }, 0);
                
                container.appendChild(toolCard);
            });
        })
        .catch(error => {
            console.error('Error:', error);
            loadingContainer.style.display = 'none';
            container.innerHTML = '<p class="message error">Error loading tools. Please try again later.</p>';
        });
};
