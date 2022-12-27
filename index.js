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
const gamesCollection = client.db("tic-tac-toe").collection("games");

const run = async () => {
    try {
        client.connect();

        // USER RELATED ROUTES

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
        app.get("/userinfo", async (req, res) => {
            const username = req.query.username;
            const email = req.query.email;
            let user;
            if (username) {
                user = await usersCollection.findOne({ username: username });
            }
            else if (email) {
                user = await usersCollection.findOne({ email: email });
            }
            if (user) {
                return res.send({ success: true, user: user })
            }
            else {
                return res.send({ error: "user not found" })
            }
        })
        //-----------

        // Game Related Routes

        // Start a Game
        app.post("/start-game", async (req, res) => {
            const userEmail = req.body.user;
            const partnerEmail = req.body.partner;
            const user = await usersCollection.findOne({ email: userEmail })
            const partner = await usersCollection.findOne({ email: partnerEmail });
            if (!partner) {
                return res.send({ error: "user not found. please enter a valid email" })
            }
            const move = user.username;
            const game = {
                players: { initializer: user.username, partner: partner.username },
                pieces: { "x": user.username, "o": partner.username },
                move: user.username,
                status: `${move}'s Move"`,
                lastUpdated: new Date()
            };

            const result = await gamesCollection.insertOne(game);

            if (result.insertedId) {
                return res.send({ success: true, insertedId: result.insertedId });
            }
        });

        // get all games
        app.get("/all-games/:user", async (req, res) => {
            const user = req.params.user;
            const query = { $or: [{ "players.initializer": user }, { "players.partner": user }] }
            const games = await gamesCollection.find(query).toArray();
            console.log(games)
            res.send(games);
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