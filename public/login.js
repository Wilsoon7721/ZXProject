// Presence of "document" signifies that this JS file is meant for browser to execute.
// As such, do NOT utilize NodeJS to execute this file (you can try, but it doesn't work)
// This file injects the JavaScript code required for the homepage (index.ejs) file.
// Remember that 'ejs' files are NOT JavaScript files, but HTML files with added functionality.

document.addEventListener('DOMContentLoaded', () => {
    let loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', (event) => {
        // For a submission event, the default is to pass the username and password to the parameters.
        // For example, it will send a GET request to http://localhost:3000/login?username={username}&password={password}
        // This default behaviour is considered unsafe because anyone can see the username and password in plain text.
        // As such, we use preventDefault() to prevent the original request, and we can implement our own logic below.
        event.preventDefault();

        let username = document.getElementById('login-user').value;
        let password = document.getElementById('login-pass').value;
        let rememberMe = document.getElementById('login-remember').checked;
        let displayBox = document.getElementById('display');

        let reqBody = JSON.stringify({
            username: username,
            password: password,
            remember: rememberMe
        });
        
        // We send another request to /login, but using POST instead.
        fetch('/login', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: reqBody
        })
        .then(async response => {
            if (response.ok) {
                displayBox.style.border = '1.75px solid green';
                displayBox.style.color = 'green';
                displayBox.textContent = "Login successful. Redirecting...";
                displayBox.style.display = 'block';
                setTimeout(() => window.location.href = "/", 2000);
            } else {
                let data = await response.json();
                displayBox.style.display = 'block';
                displayBox.style.border = '1.75px solid lightcoral';
                displayBox.style.color = 'red';
                displayBox.textContent = `Error: ${data.error}`;
                setTimeout(() => displayBox.style.display = 'none', 5000);
            }
        })
        .catch(error => {
            console.error("Encountered an error trying to send a POST request to /login\n", error);
            displayBox.style.display = 'block';
            displayBox.style.border = '1.75px solid red';
            displayBox.style.color = 'red';
            displayBox.textContent = `Internal error: ${error.message}`;
            setTimeout(() => displayBox.style.display = 'none', 5000);
        });
    });
});