// === SETUP ===
const express = require('express');
const argon2 = require('argon2');
const mysql = require("mysql2")
const dotenv = require('dotenv')
const cookieParser = require('cookie-parser')
const { generate_jwt, verify_jwt, get_jwt_payload } = require('./helpers');

const app = express();


dotenv.config({ path: './.env' })
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
})

db.connect((error) => {
    if (error) {
        console.log(error)
    } else {
        console.log("MySQL connected!")
    }
})

app.set('view engine', 'hbs')
app.use(express.urlencoded({ extended: 'false' }))
app.use(express.json())
app.use(cookieParser());

// === APPLICATION LOGIC ===

const cookie_identifier = 'session_id';
const api_header_name = 'x-api-key';

let api_data = {
    "aperson": { posts: ["some post", "another post"], can_view: ["otherperson"] },
    "xx": { posts: ["some post", "another post"], can_view: ["aperson"] }
}

let example_date = new Date();
example_date.setMilliseconds(0);
let valid_csrf_tokens = {
    "random_token": { user: "a_user", issued_at: example_date }
};
function gen_csrf_token() {
    return Math.random().toString(36).slice(2)
}

function can_user_view_posts(resource_email, performer_email) {
    // api_data[req.params.email] && api_data[req.params.email]["can_view"].includes(get_jwt_payload(header_value).email)
    if (resource_email == performer_email) { return true }
    if (api_data[resource_email]["can_view"].includes(performer_email)) { return true }
    return false
}

app.get("/", (req, res) => { res.render("index") })
app.get("/register", (req, res) => { res.render("register") })
app.get("/login", (req, res) => { res.render("login") })

app.get("/logout", (req, res) => {
    res.clearCookie(cookie_identifier)
    res.redirect('login');
})

app.get("/welcome", (req, res) => {
    if (!req.cookies.session_id || !verify_jwt(req.cookies.session_id)) {
        return res.render('login', { message: "log in first" })
    }
    return res.render("welcome", { email: get_jwt_payload(req.cookies.session_id).email })
})

app.get("/users/posts/new", (req, res) => {
    if (!req.cookies.session_id || !verify_jwt(req.cookies.session_id)) {
        return res.render('login', { message: "log in first" })
    }
    const token = gen_csrf_token();
    const email = get_jwt_payload(req.cookies.session_id).email;
    let issued_date = new Date();
    issued_date.setMilliseconds(0);
    valid_csrf_tokens[token] = { user: email, issued_at: issued_date }
    return res.render("create_post", { csrf_token: token })
})

app.post("/users/posts", (req, res) => {
    if (!req.cookies.session_id || !verify_jwt(req.cookies.session_id)) {
        return res.render('login', { message: "log in first" })
    }
    if (!req.body.content) { return res.render('create_post', { message: "Add some content" }) }
    const email = get_jwt_payload(req.cookies.session_id).email;
    if (email != valid_csrf_tokens[req.body._csrf].user) {
        const token = gen_csrf_token();
        let issued_date = new Date();
        issued_date.setMilliseconds(0);
        valid_csrf_tokens[token] = { user: email, issued_at: issued_date }
        return res.render('create_post', { csrf_token: token, message: "nice try, don't tamper with the csrf" })
    }
    if (api_data[email]) { api_data[email].posts.push(req.body.content) }
    else if (!api_data[email]) {
        api_data[email] = { posts: [req.body.content], can_view: [] }
    }
    res.redirect('/welcome');
})
app.post("/users/unprotected_posts", (req, res) => {
    if (!req.cookies.session_id || !verify_jwt(req.cookies.session_id)) {
        return res.render('login', { message: "log in first" })
    }
    if (!req.body.content) { return res.render('create_post', { message: "Add some content" }) }
    const email = get_jwt_payload(req.cookies.session_id).email;
    if (api_data[email]) { api_data[email].posts.push(req.body.content) }
    else if (!api_data[email]) {
        api_data[email] = { posts: [req.body.content], can_view: [] }
    }
    res.redirect('/welcome');
})

app.get("/cookieapi/users/:email/posts", (req, res) => {
    res.set('Access-Control-Allow-Origin', 'http://localhost:4000')
    if (!req.cookies.session_id || !verify_jwt(req.cookies.session_id)) {
        return res.status(499).json("invalid or missing jwt")
    } else if (can_user_view_posts(req.params.email, get_jwt_payload(req.cookies.session_id).email)) {
        return res.status(200).json(api_data[req.params.email]["posts"])
    }

    return res.status(400).json("not allowed to view this person his/her posts")
})

app.get("/api/users/:email/posts", (req, res) => {
    res.set('Access-Control-Allow-Origin', 'http://localhost:4000')
    let header_value = req.header(api_header_name)
    if (!header_value || !verify_jwt(header_value)) {
        return res.status(499).json("invalid or missing jwt")
    } else if (can_user_view_posts(req.params.email, get_jwt_payload(header_value).email)) {
        return res.status(200).json(api_data[req.params.email]["posts"])
    }

    return res.status(400).json("not allowed to view this person his/her posts")
})

app.post("/auth/login", (req, res) => {
    if (!req.body.email || !req.body.password) {
        res.render('login', { message: "Enter both email and pasword" })
    } else {
        var x = process.hrtime();
        const { email, password } = req.body
        db.query('SELECT email, hashed_password FROM users WHERE email = ?', [email], async (error, result) => {
            if (error) {
                console.log(error)
            } else if (result.length == 0) {
                t = process.hrtime(x);
                console.log('LOGIN;EMAIL_NOT_FOUND;%d sec;%d millisec', t[0], t[1] / 1000000);
                return res.render('login', { message: 'Invalid email/password combination' })
            } else if (await argon2.verify(result[0].hashed_password, password)) {
                // Set session here
                // let session_id = generate_session_key();
                // memory_sessions[session_id] = { email: result[0].email, last_usage: unix_ts() }
                let session_id = generate_jwt(result[0].email)
                res.cookie(cookie_identifier, session_id, { sameSite: 'Strict', httpOnly: true, secure: false, maxAge: 36000000 })


                t = process.hrtime(x);
                console.log("Logging in!");
                console.log('LOGIN;LOGIN_SUCCESS;%d sec;%d millisec', t[0], t[1] / 1000000);
                res.redirect('/welcome');
            } else {
                t = process.hrtime(x);
                console.log("Invalid password");
                console.log('LOGIN;INVALID_PASSWORD;%d sec;%d millisec', t[0], t[1] / 1000000);
                return res.render('login', { message: 'Invalid email/password combination' })
            }
        })
    }
})

app.post("/auth/register", (req, res) => {
    const { email, password, password_confirm } = req.body

    db.query('SELECT email FROM users WHERE email = ?', [email], async (error, result) => {
        if (error) {
            console.log(error)
        } else if (result.length > 0) {
            return res.render('register', {
                message: 'This email is already in use'
            })
        } else if (password !== password_confirm) {
            return res.render('register', {
                message: 'Passwords do not match!'
            })
        } else {
            let hashedPassword = await argon2.hash(password)

            db.query('INSERT INTO users SET?', { email: email, hashed_password: hashedPassword }, (error, result) => {
                if (error) {
                    console.log(error)
                } else {
                    return res.render('register', {
                        message: 'User registered!'
                    })
                }
            })
        }
    })

})

app.listen(process.env.DEVPORT, () => {
    console.log("server started on port " + process.env.DEVPORT)
})