const express = require('express');
const mysql = require('mysql');
const path = require('path');

const app = express();
const sqlConnection = mysql.createConnection({
    host: "localhost", 
    user: "root",
    password: "root",
    database: "simpleblog"
});

// This method checks that the request is sent by client-side JavaScript code, and not the user.
const verifyClientSideJS = (req, res, next) => {
    let val = req.get("X-CSJS-RunOwner");
    if(!val) 
        return res.status(403).json({'error': "Your request is not allowed here."});
    next();
}

app.set('view engine', 'ejs'); // Tells Express to render HTML documents using EJS
app.set('views', __dirname + "/templates");  // Changes the location where EJS files are saved.
app.use(express.static(path.join(__dirname, 'public'))); // Tells Express to serve static files (e.g. images, css, client-side JS files) from public folder.
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/login', (req, res) => {
    res.render('login');
})

app.get('/status', (req, res) => {
    // Still implement a manual check for ClientSideJS here, and render the appropriate page.
    let val = req.get('X-CSJS-RunOwner');
    if(!val) {
        // Not ran by Client-Side JS, return a page to the user.
        sqlConnection.ping((error) => {
            if(error)
                res.render('status', {status: "Offline"});
            else
                res.render('status', {status: "Online"});
        });
        return;
    }

    // Do not render a page, instead, simply reply with a HTTP code with empty body to signify database status.
    sqlConnection.ping(error => {
        if(error)
            return res.status(503).json();
        return res.status(200).json();
    });
});

app.get('/cards/:id', verifyClientSideJS, (req, res) => {
    let cardId = req.params.id;
    if(cardId === "all") {
        // Return all in JSON
        sqlConnection.query('SELECT * FROM posts', (error, results) => {
            if(error) {
                console.error('Error fetching posts\n', error);
                return res.status(500).json({ error: 'Internal Error'});
            }
            return res.json(results); // Returns a List containing Maps of each result
        });
    }
    if(!isNaN(cardId)) {
        // It is a number.
        sqlConnection.query('SELECT * FROM posts WHERE id = ?', cardId, (error, results) => {
            if(error) {
                console.error(`Error fetching post with ID ${cardId}\n`, error);
                return res.status(500).json({ error: 'Internal Error'});
            }
            if(results.length === 0)
                return res.status(404).json({ error: `Post with ID ${cardId} not found`});
            return res.json(results[0]); // Directly returns the Map associated with the first result.
        });
    }
    return res.status(400).json({ error: 'Card ID must be numeric or \'all\''});
});

const port = 3000;
sqlConnection.connect(error => {
    if(error)
        console.error("Database connection failed.\n", error)
    else
        console.log("Database connection succeeded.");
})
app.listen(port, () => console.log(`Web server is ready on port ${port}.`))