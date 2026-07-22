document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing plant disease prediction...');
  
  const uploadArea = document.querySelector('.upload-area');
  const fileInput = document.querySelector('#file-input');
  const previewContainer = document.querySelector('.preview-container');
  const imagePreview = document.querySelector('.image-preview');
  const removeBtn = document.querySelector('.remove-btn');
  const predictBtn = document.querySelector('.predict-btn');
  const resultContainer = document.querySelector('.result-container');
  const loadingContainer = document.querySelector('.loading-container');
  
  console.log('Elements found:', {
      uploadArea: !!uploadArea,
      fileInput: !!fileInput,
      previewContainer: !!previewContainer,
      imagePreview: !!imagePreview,
      removeBtn: !!removeBtn,
      predictBtn: !!predictBtn,
      resultContainer: !!resultContainer,
      loadingContainer: !!loadingContainer
  });
  
  const diseaseName = document.querySelector('.disease-name');
  const confidence = document.querySelector('.confidence-score');
  console.log('Result elements found:', {
      diseaseName: !!diseaseName,
      confidence: !!confidence
  });

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      uploadArea.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
      uploadArea.addEventListener(eventName, highlight, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
      uploadArea.addEventListener(eventName, unhighlight, false);
  });

  function highlight(e) {
      uploadArea.classList.add('dragover');
  }

  function unhighlight(e) {
      uploadArea.classList.remove('dragover');
  }

  uploadArea.addEventListener('drop', handleDrop, false);

  function handleDrop(e) {
      const dt = e.dataTransfer;
      const files = dt.files;
      handleFiles(files);
      // Set the file input value for drag and drop
      fileInput.files = files;
  }

  fileInput.addEventListener('change', function() {
      handleFiles(this.files);
  });

  function handleFiles(files) {
      if (files.length > 0) {
          const file = files[0];
          if (file.type.startsWith('image/')) {
              displayPreview(file);
              // Ensure file input is updated
            //   fileInput.files = files;
          } else {
              alert('Please upload an image file.');
          }
      }
  }

  function displayPreview(file) {
      const reader = new FileReader();
      reader.onload = function(e) {
          imagePreview.querySelector('img').src = e.target.result;
          previewContainer.style.display = 'block';
          resultContainer.style.display = 'none';
      }
      reader.readAsDataURL(file);
  }

  removeBtn.addEventListener('click', function() {
      fileInput.value = '';
      previewContainer.style.display = 'none';
      resultContainer.style.display = 'none';
  });

  predictBtn.addEventListener('click', function() {
      if (!fileInput.files.length) {
          alert('Please upload an image first.');
          return;
      }

      const formData = new FormData();
      formData.append('image', fileInput.files[0]);

      loadingContainer.style.display = 'block';
      resultContainer.style.display = 'none';

        // LINK HERE
        // fetch('/predict', {
        fetch(`${rootUrl}/predict`, {
          method: "POST",
          body: formData
      })
      .then(async response => {
          const text = await response.text();
          if (!text) {
              throw new Error('Empty response from server');
          }
          
          try {
              const data = JSON.parse(text);
              if (!response.ok) {
                  throw new Error(data.error || 'Server error');
              }
              return data;
          } catch (e) {
              console.error('JSON parse error:', e);
              console.error('Response text:', text);
              throw new Error('Server returned invalid JSON response');
          }
      })
      .then(data => {
          if (!data.label || typeof data.confidence === 'undefined') {
              throw new Error('Invalid response format from server');
          }
          
          loadingContainer.style.display = 'none';
          resultContainer.style.display = 'block';
          
          const diseaseName = document.getElementById('disease-name');
          const confidence = document.getElementById('confidence-score');
          
          console.log('Result elements before update:', {
              diseaseName: !!diseaseName,
              confidence: !!confidence
          });
          
          if (diseaseName && confidence) {
              diseaseName.textContent = data.label;
              confidence.textContent = `${data.confidence.toFixed(2)}%`;
          } else {
              console.error('Result elements not found after prediction');
              alert('Error displaying results. Please try again.');
          }
      })
      .catch(error => {
          console.error('Prediction error:', error);
          loadingContainer.style.display = 'none';
          
          if (error.message === 'Failed to fetch') {
              alert('Could not connect to the server. Please make sure the server is running.');
          } else {
              alert(error.message || 'An error occurred during prediction. Please try again.');
          }
      });
  });
});
