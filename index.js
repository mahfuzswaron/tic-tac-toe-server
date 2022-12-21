const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
const env = require("dotenv").config();
const port = process.env.PORT || 5000;


const uri = `mongodb+srv://admin:${process.env.DB_PASS}@cluster0.oxomeyh.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const usersCollection = client.db("tic-tac-toe").collection("users");

const run = async () => {
    try {
        client.connect();

        app.post("/register", async (req, res) => {
            const user = req.body;
            console.log(user);
        })
        app.get("/all-users", async (req, res) => {
            console.log("user not found yet")
        })

    }
    catch (e) {
        console.log({ "mongoError": e })
    }
    finally {
        console.log("it's working")
    }
}


app.get("/", (req, res) => {
    res.send("Hello world");
});

app.listen(port, () => {
    console.log(`tic tac toe is running on ${port}`)
})