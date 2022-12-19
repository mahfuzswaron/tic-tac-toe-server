const express = require("express");
const app = express();
const env = require("dotenv").config();
const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
    res.send("Hello world");
});

app.listen(port, () => {
    console.log(`tic tac toe is running on ${port}`)
})