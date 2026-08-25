const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

const players = {};

io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    players[socket.id] = {
        id: socket.id,
        x: 0,
        y: 0.9,
        z: 5,
        rotationY: 0,
        health: 100
    };

    socket.emit("currentPlayers", players);

    socket.broadcast.emit("playerJoined", players[socket.id]);

    socket.on("playerMovement", (data) => {
        if (!players[socket.id]) return;

        players[socket.id] = {
            ...players[socket.id],
            ...data
        };

        socket.broadcast.emit(
            "playerMoved",
            players[socket.id]
        );
    });
socket.on("playerShot", (data) => {
    const target = players[data.targetId];

    if (!target) return;

    target.health -= data.damage;

    if (target.health < 0) {
        target.health = 0;
    }

    io.to(data.targetId).emit(
        "playerHealth",
        {
            health: target.health
        }
    );

    if (target.health <= 0) {
        target.health = 100;

        target.x = Math.random() * 10 - 5;
        target.y = 0.9;
        target.z = Math.random() * 10 - 5;

        io.to(data.targetId).emit(
            "playerHealth",
            {
                health: 100
            }
        );

        io.emit(
            "playerMoved",
            target
        );
    }
});
    socket.on("disconnect", () => {
        console.log(
            "Player disconnected:",
            socket.id
        );

        delete players[socket.id];

        io.emit("playerLeft", socket.id);
    });
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(
        `Game server running on port ${PORT}`
    );
});