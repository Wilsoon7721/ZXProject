const express = require('express');
const mysql = require('mysql');

const app = express();
const sqlConnection = mysql.createConnection({
    host: "localhost", 
    user: "root",
    password: "Java7421",
    database: "simpleblog"
});

app.set('view engine', 'ejs'); // Tells Express to render HTML documents using EJS
app.set('views', __dirname + "/templates");  // Changes the location where EJS files are saved.

app.get('/', (req, res) => {
    res.render('index');
});

const port = 3000;
sqlConnection.connect(error => {
    if(error)
        console.error("Database connection failed.\n", error)
    else
        console.log("Database connection succeeded.");
})
app.listen(port, () => console.log(`Web server is ready on port ${port}.`))