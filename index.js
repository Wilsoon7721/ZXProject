const express = require('express');
const mysql = require('mysql');
const path = require('path');

const app = express();
const SQL_HOST = "localhost";
const SQL_PORT = 3306;
const SQL_USER = "root";
const SQL_PASS = "root";
const SQL_DATABASE = "simpleblog";
var sqlConnection = mysql.createConnection({
    host: SQL_HOST, 
    port: SQL_PORT || 3306,
    user: SQL_USER,
    password: SQL_PASS,
    database: SQL_DATABASE
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
app.use(express.json()) // Tells Express to parse JSON request bodies when they come.
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/login', (req, res) => {
    res.render('login');
})

const LOGIN_PASSWORD = "admin";

// Set the first value in minutes. Example shown is 10 minutes.
const REMEMBER_ME_DURATION = 10 * 60000
app.post('/login', (req, res) => {
    let username = req.body.username;
    let password = req.body.password;
    let rememberUser = req.body.remember;
    if(username !== "admin")
        // If it's not an admin, then the server has no idea who it is. 
        return res.status(401).json({ error: "Who are you?" });
    if(password !== LOGIN_PASSWORD)
        return res.status(401).json({ error: "Incorrect password." });

    // Set up cookie to remember user.
    if(rememberUser) {
        // In real world scenarios, of course you wouldn't save a cookie like that. 
        // This cookie would mean anyone can put the cookie like this and log in. Of course it's not a good idea.
        res.cookie('user', username, { maxAge: REMEMBER_ME_DURATION }); 
    } else {
        // If the user doesn't want to be remembered. We create a SESSION cookie that will expire once the user closes the window.
        res.cookie('user', username);
    }
    return res.status(200).json()
});

var failCount = 0;
app.get('/status', (req, res) => {
    // Still implement a manual check for ClientSideJS here, and render the appropriate page.
    let val = req.get('X-CSJS-RunOwner');
    if(!val) {
        // Not ran by Client-Side JS, return a page to the user.
        sqlConnection.ping((error) => {
            let host = sqlConnection.config.host;
            let port = sqlConnection.config.port;
            if(error)
                res.render('status', {status: "Offline", hostname: `${host}`, port: `${port}`});
            else
                res.render('status', {status: "Online", hostname: `${host}`, port: `${port}`});
        });
        return;
    }

    // Do not render a page, instead, simply reply with a HTTP code with empty body to signify database status.
    try {
        sqlConnection.ping(error => {
            if(error) {
                failCount++;
                if(failCount >= 3) {
                    // Renew connection
                    sqlConnection = mysql.createConnection({
                        host: SQL_HOST, 
                        port: SQL_PORT || 3306,
                        user: SQL_USER,
                        password: SQL_PASS,
                        database: SQL_DATABASE
                    });
                    sqlConnection.connect((error) => {
                        if(error)
                            console.error("Automatic database renewal failed\n", error);
                        else
                            console.log("Completed automatic database renewal.");
                    });
                    failCount = 0;
                }
                return res.status(503).json();
            }
            return res.status(200).json();
        });
    } catch(e) {
        failCount++;
        if(failCount >= 3) {
            // Renew connection
            sqlConnection = mysql.createConnection({
                host: SQL_HOST, 
                port: SQL_PORT || 3306,
                user: SQL_USER,
                password: SQL_PASS,
                database: SQL_DATABASE
            });
            sqlConnection.connect((error) => {
                if(error)
                    console.error("Automatic database renewal failed\n", error);
                else
                    console.log("Completed automatic database renewal.");
            });
            failCount = 0;
        }
        return res.status(503).json();
    }
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