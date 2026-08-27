const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

const players = {};
const spawnPoints = [
    { x: -35, y: 0.9, z: -35 },
    { x: 35, y: 0.9, z: -35 },
    { x: -35, y: 0.9, z: 35 },
    { x: 35, y: 0.9, z: 35 },
    { x: -20, y: 0.9, z: 0 },
    { x: 20, y: 0.9, z: 0 }
];

function getRandomSpawnPoint() {
    return spawnPoints[
        Math.floor(
            Math.random() * spawnPoints.length
        )
    ];
}
io.on("connection", (socket) => {
    console.log(
        "Player connected:",
        socket.id
    );
const spawn =
    getRandomSpawnPoint();
    players[socket.id] = {
    id: socket.id,
    x: spawn.x,
    y: spawn.y,
    z: spawn.z,
    rotationY: 0,
    health: 100,
    kills: 0,
    deaths: 0,
    dead: false
};
    socket.emit(
        "currentPlayers",
        players
    );

    socket.broadcast.emit(
        "playerJoined",
        players[socket.id]
    );

    socket.on(
        "playerMovement",
        (data) => {
            if (!players[socket.id]) {
                return;
            }

            if (
                players[socket.id].dead
            ) {
                return;
            }

            players[socket.id] = {
                ...players[socket.id],
                ...data
            };

            socket.broadcast.emit(
                "playerMoved",
                players[socket.id]
            );
        }
    );

    socket.on(
        "playerShot",
        (data) => {
            const shooter =
                players[socket.id];

            const target =
                players[data.targetId];

            if (
                !shooter ||
                !target
            ) {
                return;
            }

            if (shooter.dead) {
                return;
            }

            if (target.dead) {
                return;
            }

           let damage = 25;

if (data.weapon === "heavyPistol") {
    damage = 50;
}

if (data.weapon === "pistol") {
    damage = 25;
}

            target.health -= damage;

            if (target.health < 0) {
                target.health = 0;
            }

            io.to(
                data.targetId
            ).emit(
                "playerHealth",
                {
                    health:
                        target.health
                }
            );

            if (
                target.health <= 0
            ) {
                target.dead = true;

                shooter.kills += 1;
                target.deaths += 1;

                io.to(
                    socket.id
                ).emit(
                    "playerStats",
                    {
                        kills:
                            shooter.kills,
                        deaths:
                            shooter.deaths
                    }
                );

                io.to(
                    data.targetId
                ).emit(
                    "playerStats",
                    {
                        kills:
                            target.kills,
                        deaths:
                            target.deaths
                    }
                );

                io.to(
                    data.targetId
                ).emit(
                    "playerDied"
                );

                io.emit(
    "playerKilled",
    {
        playerId: data.targetId
    }
);

                setTimeout(() => {
                    if (
                        !players[
                            data.targetId
                        ]
                    ) {
                        return;
                    }

                    target.health = 100;
                    target.dead = false;

                    const respawnPoint =
    getRandomSpawnPoint();

target.x =
    respawnPoint.x;

target.y =
    respawnPoint.y;

target.z =
    respawnPoint.z;

                    io.to(
                        data.targetId
                    ).emit(
                        "playerRespawn",
                        {
                            health: 100,
                            x: target.x,
                            y: target.y,
                            z: target.z
                        }
                    );

                    io.emit(
    "playerRespawned",
    {
        playerId: data.targetId,
        x: target.x,
        y: target.y,
        z: target.z
    }
);

                    io.emit(
                        "playerMoved",
                        target
                    );
                }, 3000);
            }
        }
    );

    socket.on(
        "disconnect",
        () => {
            console.log(
                "Player disconnected:",
                socket.id
            );

            delete players[
                socket.id
            ];

            io.emit(
                "playerLeft",
                socket.id
            );
        }
    );
});

server.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            `Game server running on port ${PORT}`
        );
    }
);