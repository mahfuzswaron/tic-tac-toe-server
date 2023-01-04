const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require('body-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const env = require("dotenv").config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

const uri = `mongodb+srv://admin:${process.env.DB_PASS}@cluster0.oxomeyh.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const usersCollection = client.db("tic-tac-toe").collection("users");
const gamesCollection = client.db("tic-tac-toe").collection("games");

const gameResult = (board, pieces) => {
    const keySets = [
        ["a1", "a2", "a3"],
        ["b1", "b2", "b3"],
        ["c1", "c2", "c3"],

        ["a1", "b1", "c1"],
        ["a2", "b2", "c2"],
        ["a3", "b3", "c3"],

        ["a1", "b2", "c3"],
        ["a3", "b2", "c1"]
    ];

    const matchedChars = [];

    for (let i = 0; i < keySets.length; i++) {
        const set = keySets[i];
        let matchedCount = 0;
        set.forEach((x) => board[set[0]] === board[x] && matchedCount++)
        if (matchedCount === 3) {
            matchedChars.push(board[set[0]])
        }
    }

    const mathedPiece = matchedChars.find(x => x !== "")

    console.log(mathedPiece);

    /*  
    result logic:

    'any piece' = win
    undefined = not finished or draw
    undefined & board doesn't have any space = draw
    
    */

    if (mathedPiece) {
        return pieces[mathedPiece]
    }
    else if (!mathedPiece && !Object.values(board).filter(a => a === "").length) {
        return "draw"
    }
    else {
        return null
    }

};

const opponantPlayer = (players, lastMove) => Object.values(players).find(p => p !== lastMove);


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
            if (userEmail === partnerEmail) return res.send({ error: "sorry, you can't play against you" })
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
                board: {
                    a1: "", a2: "", a3: "",
                    b1: "", b2: "", b3: "",
                    c1: "", c2: "", c3: ""
                },
                status: {
                    finished: false,
                    message: {
                        [user.username]: `Your Move`,
                        [partner.username]: `${user.username}'s Move`
                    }
                },
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
            const games = await gamesCollection.find(query).sort({ lastUpdated: -1 }).toArray();
            // console.log(games)
            res.send(games);
        });

        // get single game 

        const getGameById = async id => {
            const game = await gamesCollection.findOne({ _id: ObjectId(id) })
            return game;
        };

        app.get("/get-game/:id", async (req, res) => {
            const id = req.params.id
            const game = await getGameById(id);
            res.send(game);
        });

        /*
        game logic:
        if the board is completed: check who wins or draw
        else: update current board

        */

        // update a game 
        app.patch("/play/:id", async (req, res) => {
            const id = ObjectId(req.params.id);
            const query = { _id: id };
            const board = req.body;
            const game = await getGameById(id);
            const move = opponantPlayer(game.players, game.move);
            // `${game.move} has moved.\nNow it's ${move}'s move`
            const updatedGame = {
                board: board,
                move: move,
                status: {
                    finished: false,
                    message: {
                        [game.move]: `You have moved.\nNow it's ${move}'s move`,
                        [move]: `${game.move} has moved.\nNow it's your move`
                    },
                },
                lastUpdated: new Date()
            }

            const winner = gameResult(board, game.pieces);

            if (winner) {
                if (winner === "draw") {
                    updatedGame.winner = "You Both"
                    updatedGame.status = {
                        finished: true,
                        message: {
                            [game.move]: "This game is draw. You both won!",
                            [move]: "This game is draw. You both won!"
                        }
                    }
                }
                else {
                    updatedGame.winner = winner
                    updatedGame.status = {
                        finished: true,
                        message: {
                            [winner]: "Congratulations! You've won the match!",
                            [opponantPlayer(game.players, winner)]: `${winner} has won the match`
                        }
                    }
                }
                updatedGame.move = null;
            }

            const result = await gamesCollection.updateOne(query, { $set: updatedGame });

            res.send(result)
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

const server = app.listen(port, () => {
    console.log(`tic tac toe is running on ${port}`)
});

const io = require("socket.io")(server, {
    cors: {
        origin: "http://localhost:3000"
    }
});

io.on("connection", (socket) => {

    // join room by roomId
    socket.on("join_room", (roomId) => {
        socket.join(roomId)
    })

    // set & get updated data
    socket.on("set_data", (data) => {
        socket.to(data?.roomId).emit("get_data", data)
    })
});

