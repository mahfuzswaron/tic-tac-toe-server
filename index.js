const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require('body-parser');
const { MongoClient, ServerApiVersion } = require('mongodb');
const env = require("dotenv").config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

const uri = `mongodb+srv://admin:${process.env.DB_PASS}@cluster0.oxomeyh.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const usersCollection = client.db("tic-tac-toe").collection("users");

const run = async () => {
    try {
        client.connect();

        app.post("/register", async (req, res) => {
            const user = req.body;
            const usernameExists = await usersCollection.find({ username: user.username }).toArray();
            const emailExists = await usersCollection.find({ email: user.email }).toArray();
            if (usernameExists.length) {
                return res.send({ error: "username unavailable. please try another one." })
            }
            else if (emailExists.length) {
                return res.send({ error: "This Email is already exists. please try another one." })
            }
            const result = await usersCollection.insertOne(user);
            if (result.insertedId) {
                return res.send({ success: "congrats, you've been joined!" });
            }
        })
        app.get("/userinfo/:username", async (req, res) => {
            const username = req.params.username;
            const user = await usersCollection.findOne({ username: username });
            if (user) {
                return res.send({ success: true, user: user })
            }
            else {
                return res.send({ error: "user not found" })
            }
        })

    }
    catch (e) {
        console.log({ "mongoError": e })
    }
    finally {
        console.log("it's working")
    }
}
run();

app.get("/", (req, res) => {
    res.send("Hello world");
});

app.listen(port, () => {
    console.log(`tic tac toe is running on ${port}`)
})