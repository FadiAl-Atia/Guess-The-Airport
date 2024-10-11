import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import session from "express-session";

const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 }
}));


app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "airports_quiz",
    password: "1234",
    port: 5432,
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed', err.stack);
    } else {
        console.log('Connected to the database');
    }
});


app.post("/search", async (req, res) => {
    console.log(req.body.search_input);
    var searched_country = req.body.search_input;
    const searched_country_rows = await db.query(`SELECT * FROM airports WHERE country = $1`, [searched_country]);
    const country_array = searched_country_rows.rows;

    req.session.country_search_result = country_array;
    res.redirect("/");
});


app.post("/submitanswer", async (req, res) => {
    let answer = "Wrong";
    try {
        const country_row = await db.query(`SELECT * FROM airports WHERE icao = '${req.body.airport_input}'`);
        if (country_row.rows.length > 0 && country_row.rows[0].country === req.body.country) {
            answer = "Correct";
        }
        req.session.answer = answer;
    } catch (err) {
        console.error("Error executing query", err.stack);
    }

    res.redirect("/");
});


app.get("/", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM airports");
        const country_name_decider = Math.floor(Math.random() * (result.rows.length));
        let country = result.rows[country_name_decider].country;
        const answer = req.session.answer || "";
        const country_search_result = req.session.country_search_result || [];
        req.session.answer = null;
        req.session.country_search_result = null;
        res.render("index.ejs", {
            quiz: result.rows,
            country: country,
            answer: answer,
            country_search_result: country_search_result,
        });

    } catch (err) {
        console.error("Error executing query", err.stack);
        res.status(500).send('Error retrieving data from the database');
    }
});


app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
