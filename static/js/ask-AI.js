document.addEventListener('DOMContentLoaded', function() {
  const cropSearchForm = document.getElementById('crop-search-form');
  const cropNameInput = document.getElementById('crop-name');
  const searchBtn = document.getElementById('search-btn');
  const loadingContainer = document.getElementById('loading-container');
  const resultContainer = document.getElementById('result-container');
  const resultContent = document.getElementById('result-content');
  const resultTitle = document.getElementById('result-title');
  const printBtn = document.getElementById('print-btn');
  const popularTags = document.querySelectorAll('.tag');

  cropSearchForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const cropName = cropNameInput.value.trim();
    if (!cropName) return;
    
    searchCrop(cropName);
  });

  popularTags.forEach(tag => {
    tag.addEventListener('click', function() {
      const cropName = this.getAttribute('data-crop');
      cropNameInput.value = cropName;
      searchCrop(cropName);
    });
  });

  printBtn.addEventListener('click', function() {
    window.print();
  });

  async function searchCrop(cropName) {
    loadingContainer.style.display = 'block';
    resultContainer.style.display = 'none';
    
    try {
      const response = await fetchCropInformation(cropName);

      resultTitle.textContent = `${cropName} Information`;
      
      displayResults(response);
      
      // resultContainer.scrollIntoView({ behavior: 'smooth' });
      const resultTop = resultContainer.offsetTop;
      const viewportHeight = window.innerHeight;
      const scrollPosition = resultTop - (viewportHeight * 0.33);
      window.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
      
    } catch (error) {
      console.error('Error fetching crop information:', error);
      displayError('Failed to fetch crop information. Please try again later.');
    } finally {
      loadingContainer.style.display = 'none';
    }
  }

  async function fetchCropInformation(cropName) {
    try {
      // LINK HERE
      // const response = await fetch('/get_crop_info', {
      const response = await fetch(`${rootUrl}/get_crop_info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ crop: cropName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch crop information');
      }

      const data = await response.json();
      return {
        cropName: cropName,
        info: data.info
      };
    } catch (error) {
      console.error('Error fetching crop information:', error);
      throw error;
    }
  }

  function parseMarkdown(text) {
    text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    
    text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    
    text = text.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    text = text.replace(/^\s*\*\s+(.+)$/gm, '<li>$1</li>');
    
    text = text.replace(/<li>(.+)<\/li>(\s*<li>(.+)<\/li>)+/g, function(match) {
      return '<ul>' + match + '</ul>';
    });
    
    text = text.replace(/\n\n/g, '</p><p>');
    
    text = text.replace(/\n/g, '<br>');
    
    if (!text.startsWith('<h') && !text.startsWith('<p>')) {
      text = '<p>' + text + '</p>';
    }
    
    return text;
  }

  function displayResults(data) {
    const parsedContent = parseMarkdown(data.info);
    resultContent.innerHTML = parsedContent;
    resultContainer.style.display = 'block';
  }

  function displayError(message) {
    resultContent.innerHTML = `
      <div class="error-message">
        <p>${message}</p>
      </div>
    `;
    
    resultContainer.style.display = 'block';
  }
});

