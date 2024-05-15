// Presence of "document" signifies that this JS file is meant for browser to execute.
// As such, do NOT utilize NodeJS to execute this file (you can try, but it doesn't work)
// This file injects the JavaScript code required for the homepage (index.ejs) file.
// Remember that 'ejs' files are NOT JavaScript files, but HTML files with added functionality.

document.addEventListener("DOMContentLoaded", () => { 
    let loginButton = document.getElementById("start-login-button");
    loginButton.addEventListener('click', () => window.location.href = '/login');

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
});

// Initialize internal functions for building Bootstrap cards
function initializeCards() {
    // Obtain cards
    
}