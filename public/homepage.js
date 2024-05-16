// Presence of "document" signifies that this JS file is meant for browser to execute.
// As such, do NOT utilize NodeJS to execute this file (you can try, but it doesn't work)
// This file injects the JavaScript code required for the homepage (index.ejs) file.
// Remember that 'ejs' files are NOT JavaScript files, but HTML files with added functionality.

let COLOR_NO_SEL_FILE = 'rgb(0, 140, 233)';
let COLOR_FILE_CURR_SEL = 'rgb(0, 233, 6)';
document.addEventListener("DOMContentLoaded", () => {
    document.querySelector('#image-upload-button').addEventListener('click', () => document.querySelector('#fileInput').click());
      

    // If the database is not ready, notify the user.
    fetch('/status', {
        method: 'GET',
        headers: {
            'X-CSJS-RunOwner': 'True'
        } 
    }).then(response => {
        if(!response.ok)
            alert("The posts cannot be obtained currently as the database is not available. You may want to try again later.");
    });

    // Modal: If fileInput received the image, JS should change the file name shown.
    let uploadImageButton = document.getElementById("image-upload-button");
    let uploadImageButtonText = document.querySelector('#image-upload-button p');
    let imagePreview = document.getElementById('image-upload-preview');
    let fileInput = document.getElementById('fileInput');
    let deleteUploadButton = document.getElementById('image-upload-cancel');
    deleteUploadButton.addEventListener('click', (event) => {
        event.stopPropagation();    
        fileInput.files = null;
        uploadImageButtonText.textContent = "Upload Image";
        uploadImageButton.style.color = COLOR_NO_SEL_FILE;
        uploadImageButton.style.border = `1.5px solid ${COLOR_NO_SEL_FILE}`;
        imagePreview.setAttribute('hidden', 'true');
        deleteUploadButton.setAttribute('hidden', 'true');
        imagePreview.src = '';
    });
    fileInput.addEventListener('change', () => {
        if(fileInput.files.length > 0) {
            uploadImageButtonText.textContent = `Image: ${fileInput.files[0].name}`; 
            uploadImageButton.style.color = COLOR_FILE_CURR_SEL;
            uploadImageButton.style.border = `1.5px solid ${COLOR_FILE_CURR_SEL}`;
            imagePreview.removeAttribute('hidden');
            deleteUploadButton.removeAttribute('hidden');
            imagePreview.src = URL.createObjectURL(fileInput.files[0]); 
        } else {
            uploadImageButtonText.textContent = "Upload Image";
            uploadImageButton.style.color = COLOR_NO_SEL_FILE;
            uploadImageButton.style.border = `1.5px solid ${COLOR_NO_SEL_FILE}`;
            imagePreview.setAttribute('hidden', 'true');
            deleteUploadButton.setAttribute('hidden', 'true');
            imagePreview.src = '';
        }
    });
});

// Initialize internal functions for building Bootstrap cards
function initializeCards() {
    // Obtain cards
    
}