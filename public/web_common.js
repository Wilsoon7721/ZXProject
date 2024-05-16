// Presence of "document" signifies that this JS file is meant for browser to execute.
// As such, do NOT utilize NodeJS to execute this file (you can try, but it doesn't work)
// This file injects Bootstrap JS and Bootstrap CSS into the HTML files.

document.addEventListener('DOMContentLoaded', () => {
    let link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css';
    link.integrity = 'sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);

    let script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js';
    script.integrity = 'sha384-MrcW6ZMFYlzcLA8Nl+NtUVF0sA7MsXsP1UyJoMp4YLEuNSfAP+JcXn/tWtIaxVXM';
    script.crossOrigin = 'anonymous';
    document.body.appendChild(script);
});

// Internal Function: Check for admin cookie. This function will inherit to the other client JS files.
function verifyAdminStatus() {
    let cookies = document.cookie.split(';');
    for(let cookie of cookies) {
        cookie = cookie.trim();
        if(cookie.startsWith('user=')) {
            let value = cookie.substring('user='.length);
            if(value === 'admin') {
                console.log("Recognised that this user is an admin.")
                return true;
            }
        }
        continue;
    }  
    return false;
}