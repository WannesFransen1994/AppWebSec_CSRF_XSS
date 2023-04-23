// === SETUP ===
const express = require('express');
const cookieParser = require('cookie-parser')

const app = express();

app.set('view engine', 'hbs')
app.use(express.urlencoded({ extended: 'false' }))
app.use(express.json())
app.use(cookieParser());


app.get("/", (req, res) => { res.render("attacker") })


app.listen(5000, () => {
    console.log("server started on port 5000")
})