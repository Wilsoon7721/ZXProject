const express = require('express');
const mysql = require('mysql');
const path = require('path');
const multer = require('multer');

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

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// This method checks that the request is sent by client-side JavaScript code, and not the user.
const verifyClientSideJS = (req, res, next) => {
    let val = req.get("X-CSJS-RunOwner");
    if(!val) 
        return res.status(403).json({ error: "Your request is not allowed here."});
    next();
}

// This method checks that the request is sent by an authenticated user (administrator).
const verifyUserAuth = (req, res, next) => {
    let cookies = req.headers.cookie.split(';');
    for(let cookie of cookies) {
        cookie = cookie.trim();
        if(cookie.startsWith('user=')) {
            let value = cookie.substring('user='.length);
            if(value === 'admin') {
                next();
                return;
            }
        }
        continue;
    }
    return res.status(401).json({ error: 'You need to be logged in for this action.' });
}

// This method is used to help retrieve HTML files without having to repeat the jargon.
function getHTMLFile(fileName) {
    return path.join(__dirname, 'templates', fileName);
}

app.use(express.static(path.join(__dirname, 'public'))); // Tells Express to serve static files (e.g. images, css, client-side JS files) from public folder.
app.use(express.json()) // Tells Express to parse JSON request bodies when they come.
app.use(express.urlencoded({ extended: true })); // Tells Express to parse form-data request bodies when they come.

app.get('/', (req, res) => {
    res.sendFile(getHTMLFile('index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(getHTMLFile('login.html'));
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

app.get('/sql_basic_info', verifyClientSideJS, verifyUserAuth, (req, res) => {
    return res.status(200).json({ host: sqlConnection.config.host, port: sqlConnection.config.port });
});

app.get('/status', (req, res) => {
    // Still implement a manual check for ClientSideJS here, and render the appropriate page.
    let val = req.get('X-CSJS-RunOwner');
    if(!val) {
        // Not ran by Client-Side JS, return a page to the user.
        res.sendFile(getHTMLFile('status.html'));
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

// This method would mean that it requires both client-side JS to run, and for the cookie to be present.
app.post('/cards', verifyClientSideJS, verifyUserAuth, upload.single('image_data'), (req, res) => {
    let title = req.body.title;
    let content = req.body.content;
    let image = req.file;
    let imageData = null
    if(image)
        imageData = image.buffer;
    
    sqlConnection.query('INSERT INTO posts (title, postContent, postImage) VALUES (?, ?, ?)', [title, content, imageData], (error, results, fields) => {
        if(error) {
            console.error("An error occurred while inserting post\n", error);
            return res.status(500).json({ error: error});
        }

        console.log("Post successfully added to MySQL database.");
        return res.status(200).json({ id: results.insertId });
    }); 
});

app.get('/cards/:id', verifyClientSideJS, (req, res) => {
    let cardId = req.params.id;
    
    if(cardId === "all") {
        // Return all in JSON
        sqlConnection.query('SELECT * FROM posts', (error, results) => {
            if(error) {
                console.error('Error fetching posts\n', error);
                return res.status(500).json({ error: error });
            }
            return res.json(results); // Returns a List containing Maps of each result
        });
    } else if(!isNaN(cardId)) {
        // It is a number.
        sqlConnection.query('SELECT * FROM posts WHERE id = ?', [cardId], (error, results) => {
            if(error) {
                console.error(`Error fetching post with ID ${cardId}\n`, error);
                return res.status(500).json({ error: error});
            }
            if(results.length === 0) {
                return res.status(404).json({ error: `Post with ID ${cardId} not found`});
            }
            return res.json(results[0]); // Directly returns the Map associated with the first result.
        });
    } else {
        return res.status(400).json({ error: 'Card ID must be numeric or \'all\''});
    }
});

app.delete('/cards/:id', verifyClientSideJS, verifyUserAuth, (req, res) => {
    let cardId = req.params.id;
    if(cardId === "all") {
        // Unconditionally delete all posts
        sqlConnection.query('DELETE from posts', (error, results) => {
            if(error) {
                console.error('Error deleting posts\n', error);
                return res.status(500).json({ error: error });
            }
            // Return a success, and the amount of rows deleted.
            return res.json({ count: results.affectedRows });
        });
    } else if(!isNaN(cardId)) {
        // Number
        sqlConnection.query('DELETE FROM posts WHERE id = ?', [cardId], (error, results) => {
            if(error) {
                console.error(`Error deleting post with ID ${cardId}`, error);
                return res.status(500).json({ error: error});
            }
            // Return a success, and empty response.
            return res.json();
        });
    } else {
        return res.status(400).json({ error: 'Card ID must be numeric or \'all\''});
    }
});

app.post(`/cards/update/:id`, verifyClientSideJS, verifyUserAuth, upload.single('image_data'), (req, res) => {
    let cardId = req.params.id;
    if(!isNaN(cardId)) {
        if(req.body.length === 0)
            return res.status(400).json({ error: 'Request body containing data to change must be specified.' });
        let image = req.file;
        let buffer = null
        if(image) {
            buffer = image.buffer;
        }
        // Build SQL query one by one
        let q = `UPDATE posts SET `;
        let params = [];
        if('title' in req.body) {
            q += `title = ?, `;
            params.push(req.body.title);
        }

        if('content' in req.body) {
            q += `postContent = ?, `;
            params.push(req.body.content);
        }

        if(buffer) {
            q += 'postImage = ? ';
            params.push(buffer);
        }

        if(params.length === 0)
            return res.status(400).json({ error: "No valid values were provided." });

        if(q.trim().endsWith(","))
            q = q.trimEnd().slice(0, -1);

        q += `WHERE id = ?`;
        params.push(cardId);
        sqlConnection.query(q, params, (error, results) => {
            if(error) {
                console.error('MySQL Update Failed.\n', error);
                res.status(500).json({ error: error });
                return;
            }
            if(results.affectedRows === 0) {
                res.status(404).json({ error: "The post does not exist." });
                return;
            }
            return res.json({ update: 'success' });
        });
    } else {
        return res.status(400).json({ error: 'Card ID must be numeric.' });
    }
});

const port = 3000;
sqlConnection.connect(error => {
    if(error)
        console.error("Database connection failed.\n", error)
    else
        console.log("Database connection succeeded.");
})
app.listen(port, () => console.log(`Web server is ready on port ${port}.`))