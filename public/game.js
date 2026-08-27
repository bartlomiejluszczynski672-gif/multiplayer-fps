import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const socket = io();

let scene;
let camera;
let renderer;
let player;
let weapon;

let yaw = 0;
let pitch = 0;

const keys = {};
const otherPlayers = {};

const playerSpeed = 0.12;

let lastNetworkUpdate = 0;

let kills = 0;
let deaths = 0;
let isDead = false;

// WEAPON SYSTEM
const weapons = {
    pistol: {
        name: "TACTICAL PISTOL",
        magazineSize: 12,
        ammo: 12,
        reserveAmmo: 36,
        damage: 25,
        fireDelay: 250,
        reloadTime: 1400,
        recoil: 0.025
    },

    heavyPistol: {
        name: "HEAVY PISTOL",
        magazineSize: 7,
        ammo: 7,
        reserveAmmo: 21,
        damage: 50,
        fireDelay: 600,
        reloadTime: 1800,
        recoil: 0.05
    }
};

let currentWeaponKey = "pistol";

let isReloading = false;
let canShoot = true;

init();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    renderer = new THREE.WebGLRenderer({
        antialias: true
    });

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 2)
    );

    document.body.appendChild(renderer.domElement);

    createLighting();
    createMap();
    createPlayer();
    createWeapon();
    setupControls();
    updateHUD();

    window.addEventListener(
        "resize",
        onResize
    );

    animate();
}

function createLighting() {
    const ambientLight = new THREE.AmbientLight(
        0xffffff,
        1.5
    );

    scene.add(ambientLight);

    const sun = new THREE.DirectionalLight(
        0xffffff,
        2
    );

    sun.position.set(
        20,
        30,
        10
    );

    scene.add(sun);
}

function createMap() {
    const groundGeometry = new THREE.BoxGeometry(
        100,
        1,
        100
    );

    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444
    });

    const ground = new THREE.Mesh(
        groundGeometry,
        groundMaterial
    );

    ground.position.y = -0.5;

    scene.add(ground);

    createBox(0, 2, -15, 12, 4, 4);
    createBox(-15, 2, -5, 4, 4, 12);
    createBox(15, 2, -5, 4, 4, 12);

    createBox(-10, 1.5, 10, 6, 3, 6);
    createBox(10, 1.5, 10, 6, 3, 6);

    createBox(0, 1, 20, 20, 2, 4);

    createBox(-5, 0.75, 0, 3, 1.5, 3);
    createBox(5, 0.75, 0, 3, 1.5, 3);
}

function createBox(
    x,
    y,
    z,
    width,
    height,
    depth
) {
    const geometry = new THREE.BoxGeometry(
        width,
        height,
        depth
    );

    const material = new THREE.MeshStandardMaterial({
        color: 0x777777
    });

    const box = new THREE.Mesh(
        geometry,
        material
    );

    box.position.set(
        x,
        y,
        z
    );

    scene.add(box);

    return box;
}

function createPlayer() {
    const geometry = new THREE.BoxGeometry(
        0.8,
        1.8,
        0.8
    );

    const material = new THREE.MeshStandardMaterial({
        color: 0x222222
    });

    player = new THREE.Mesh(
        geometry,
        material
    );

    player.position.set(
        0,
        0.9,
        5
    );

    scene.add(player);

    camera.position.set(
        0,
        1.7,
        5
    );
}
function getCurrentWeapon() {
    return weapons[currentWeaponKey];
}
function createWeapon() {
    weapon = new THREE.Group();

    const bodyGeometry = new THREE.BoxGeometry(
        0.22,
        0.18,
        0.6
    );

    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222
    });

    const body = new THREE.Mesh(
        bodyGeometry,
        bodyMaterial
    );

    body.position.set(
        0.28,
        -0.22,
        -0.6
    );

    weapon.add(body);

    const barrelGeometry = new THREE.BoxGeometry(
        0.08,
        0.08,
        0.35
    );

    const barrelMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111
    });

    const barrel = new THREE.Mesh(
        barrelGeometry,
        barrelMaterial
    );

    barrel.position.set(
        0.28,
        -0.18,
        -0.95
    );

    weapon.add(barrel);

    camera.add(weapon);
    scene.add(camera);
}
function updateWeaponModel() {
    if (!weapon) return;

    weapon.rotation.set(0, 0, 0);
    weapon.position.set(0, 0, 0);
    weapon.scale.set(1, 1, 1);

    if (currentWeaponKey === "pistol") {
        weapon.scale.set(
            1,
            1,
            1
        );

        weapon.position.set(
            0,
            0,
            0
        );
    }

    if (currentWeaponKey === "heavyPistol") {
        weapon.scale.set(
            1.35,
            1.2,
            1.3
        );

        weapon.position.set(
            0.03,
            -0.03,
            0.02
        );
    }
}
function setupControls() {
    document.addEventListener(
        "keydown",
        (event) => {
            keys[event.code] = true;

            if (event.code === "KeyR") {
                reload();
            }
            
            if (event.code === "Digit1") {
    switchWeapon("pistol");
}

if (event.code === "Digit2") {
    switchWeapon("heavyPistol");
}
        }
    );

    document.addEventListener(
        "keyup",
        (event) => {
            keys[event.code] = false;
        }
    );

    document.addEventListener(
        "mousemove",
        (event) => {
            if (
                document.pointerLockElement !==
                document.body
            ) {
                return;
            }

            yaw -= event.movementX * 0.002;
            pitch -= event.movementY * 0.002;

            pitch = Math.max(
                -Math.PI / 2,
                Math.min(
                    Math.PI / 2,
                    pitch
                )
            );
        }
    );

    document.addEventListener(
        "mousedown",
        (event) => {
            if (
                event.button === 0 &&
                document.pointerLockElement === document.body
            ) {
                shoot();
            }
        }
    );

    document
        .getElementById("startButton")
        .addEventListener(
            "click",
            () => {
                document.body.requestPointerLock();

                document
                    .getElementById("startScreen")
                    .style.display = "none";
            }
        );

    renderer.domElement.addEventListener(
        "click",
        () => {
            if (isDead) return;

            if (
                document.pointerLockElement !==
                document.body
            ) {
                document.body.requestPointerLock();
            }
        }
    );
}

function updateMovement() {
    if (!player) return;
    if (isDead) return;

    const direction = new THREE.Vector3();

    if (keys["KeyW"]) {
        direction.z -= 1;
    }

    if (keys["KeyS"]) {
        direction.z += 1;
    }

    if (keys["KeyA"]) {
        direction.x -= 1;
    }

    if (keys["KeyD"]) {
        direction.x += 1;
    }

    if (direction.length() > 0) {
        direction.normalize();

        direction.applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            yaw
        );

        player.position.addScaledVector(
            direction,
            playerSpeed
        );
    }

    player.rotation.y = yaw;

    camera.position.x = player.position.x;
    camera.position.y = player.position.y + 0.8;
    camera.position.z = player.position.z;

    camera.rotation.order = "YXZ";

    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
}
function switchWeapon(weaponKey) {
    if (!weapons[weaponKey]) return;
    if (isReloading) return;
    if (weaponKey === currentWeaponKey) return;

    currentWeaponKey = weaponKey;

    if (weapon) {
        weapon.position.y = -0.25;
    }

    setTimeout(() => {
        updateWeaponModel();
        updateHUD();

        if (weapon) {
            weapon.position.y = 0;
        }
    }, 180);
}
function shoot() {
    if (isDead) return;
    if (!canShoot) return;
    if (isReloading) return;
const currentWeapon = getCurrentWeapon();
    if (currentWeapon.ammo <= 0) {
        reload();
        return;
    }

    currentWeapon.ammo--;
    updateHUD();

    canShoot = false;

    setTimeout(() => {
        canShoot = true;
    }, currentWeapon.fireDelay);

    createMuzzleFlash();
    applyRecoil();

    const raycaster = new THREE.Raycaster();

    raycaster.setFromCamera(
        new THREE.Vector2(0, 0),
        camera
    );

    const targets = Object.values(
        otherPlayers
    );

    const hits = raycaster.intersectObjects(
        targets,
        false
    );

    if (hits.length > 0) {
        const hitPlayer = hits[0].object;

        console.log(
            "Player hit!"
        );

        showHitmarker();

        createHitEffect(
            hits[0].point
        );

        socket.emit(
    "playerShot",
    {
        targetId:
            hitPlayer.userData.playerId,
        damage: currentWeapon.damage,
        weapon: currentWeaponKey
    }
);
    }
}



function reload() {
   
    if (isReloading) return;

    const currentWeapon =
        getCurrentWeapon();

    if (
        currentWeapon.ammo ===
        currentWeapon.magazineSize
    ) {
        return;
    }

    if (
        currentWeapon.reserveAmmo <= 0
    ) {
        return;
    }

    isReloading = true;

    document.getElementById(
        "ammo"
    ).textContent =
        "RELOADING...";

    animateReload();

    setTimeout(() => {
        const missingAmmo =
            currentWeapon.magazineSize -
            currentWeapon.ammo;

        const ammoToLoad =
            Math.min(
                missingAmmo,
                currentWeapon.reserveAmmo
            );

        currentWeapon.ammo +=
            ammoToLoad;

        currentWeapon.reserveAmmo -=
            ammoToLoad;

        isReloading = false;

        updateHUD();
    }, currentWeapon.reloadTime);
}

function animateReload() {
    if (!weapon) return;

    const originalRotationZ =
        weapon.rotation.z;

    const originalPositionY =
        weapon.position.y;

    weapon.rotation.z = 0.7;
    weapon.position.y = -0.15;

    const currentWeapon =
        getCurrentWeapon();

    setTimeout(() => {
        weapon.rotation.z =
            originalRotationZ;

        weapon.position.y =
            originalPositionY;
    }, currentWeapon.reloadTime);
}
function applyRecoil() {
    const currentWeapon =
        getCurrentWeapon();

    pitch +=
        currentWeapon.recoil;

    if (weapon) {
        weapon.position.z += 0.08;

        setTimeout(() => {
            weapon.position.z -= 0.08;
        }, 80);
    }
}

function createMuzzleFlash() {
    const flashGeometry =
        new THREE.SphereGeometry(
            0.04,
            8,
            8
        );

    const flashMaterial =
        new THREE.MeshBasicMaterial({
            color: 0xffffaa
        });

    const flash =
        new THREE.Mesh(
            flashGeometry,
            flashMaterial
        );

    flash.position.set(
        0.28,
        -0.18,
        -1.15
    );

    camera.add(flash);

    setTimeout(() => {
        camera.remove(flash);
    }, 50);
}

function createHitEffect(position) {
    const geometry =
        new THREE.SphereGeometry(
            0.08,
            8,
            8
        );

    const material =
        new THREE.MeshBasicMaterial({
            color: 0xff0000
        });

    const effect =
        new THREE.Mesh(
            geometry,
            material
        );

    effect.position.copy(
        position
    );

    scene.add(effect);

    setTimeout(() => {
        scene.remove(effect);
    }, 200);
}
function showHitmarker() {
    const hitmarker =
        document.getElementById(
            "hitmarker"
        );

    hitmarker.style.display =
        "block";

    setTimeout(() => {
        hitmarker.style.display =
            "none";
    }, 120);
}

function updateHUD() {
    const currentWeapon =
        getCurrentWeapon();

    document.getElementById(
        "ammo"
    ).textContent =
        `${currentWeapon.name} | AMMO: ${currentWeapon.ammo} / ${currentWeapon.reserveAmmo}`;
}

function sendPlayerPosition() {
    if (isDead) return;

    const now = Date.now();

    if (
        now - lastNetworkUpdate < 50
    ) {
        return;
    }

    lastNetworkUpdate = now;

    if (!player) return;

    socket.emit(
        "playerMovement",
        {
            x: player.position.x,
            y: player.position.y,
            z: player.position.z,
            rotationY: yaw
        }
    );
}

function animate() {
    requestAnimationFrame(
        animate
    );

    updateMovement();
    sendPlayerPosition();

    renderer.render(
        scene,
        camera
    );
}

// MULTIPLAYER

socket.on(
    "currentPlayers",
    (serverPlayers) => {
        Object
            .values(serverPlayers)
            .forEach(
                (playerData) => {
                    if (
                        playerData.id !==
                        socket.id
                    ) {
                        createOtherPlayer(
                            playerData
                        );
                    }
                }
            );
    }
);

socket.on(
    "playerJoined",
    (playerData) => {
        if (
            playerData.id !==
            socket.id
        ) {
            createOtherPlayer(
                playerData
            );
        }
    }
);

socket.on(
    "playerMoved",
    (playerData) => {
        if (
            playerData.id ===
            socket.id
        ) {
            return;
        }

        updateOtherPlayer(
            playerData
        );
    }
);

socket.on(
    "playerLeft",
    (id) => {
        if (otherPlayers[id]) {
            scene.remove(
                otherPlayers[id]
            );

            delete otherPlayers[id];
        }
    }
);

function createOtherPlayer(
    playerData
) {
    if (
        otherPlayers[
            playerData.id
        ]
    ) {
        return;
    }

    const geometry =
        new THREE.BoxGeometry(
            0.8,
            1.8,
            0.8
        );

    const material =
        new THREE.MeshStandardMaterial({
            color: 0xff3333
        });

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.position.set(
        playerData.x,
        playerData.y,
        playerData.z
    );

    mesh.rotation.y =
        playerData.rotationY ||
        0;

    mesh.userData.playerId =
        playerData.id;

    scene.add(mesh);

    otherPlayers[
        playerData.id
    ] = mesh;
}

function updateOtherPlayer(
    playerData
) {
    let mesh =
        otherPlayers[
            playerData.id
        ];

    if (!mesh) {
        createOtherPlayer(
            playerData
        );

        mesh =
            otherPlayers[
                playerData.id
            ];
    }

    if (!mesh) return;

    mesh.position.set(
        playerData.x,
        playerData.y,
        playerData.z
    );

    mesh.rotation.y =
        playerData.rotationY ||
        0;
}

socket.on(
    "playerHealth",
    (data) => {
        document.getElementById(
            "health"
        ).textContent =
            `HP: ${data.health}`;
    }
);

socket.on(
    "playerStats",
    (data) => {
        kills = data.kills;
        deaths = data.deaths;

        document.getElementById(
            "stats"
        ).textContent =
            `KILLS: ${kills} | DEATHS: ${deaths}`;
    }
);

socket.on(
    "playerDied",
    () => {
        console.log("YOU DIED EVENT RECEIVED");

        isDead = true;

        const deathScreen =
            document.getElementById(
                "deathScreen"
            );

        const respawnText =
            document.getElementById(
                "respawnText"
            );

        if (deathScreen) {
            deathScreen.style.display =
                "flex";
        }

        if (respawnText) {
            respawnText.textContent =
                "Respawning in 3...";
        }

        if (
            document.pointerLockElement
        ) {
            document.exitPointerLock();
        }

        setTimeout(() => {
            if (
                isDead &&
                respawnText
            ) {
                respawnText.textContent =
                    "Respawning in 2...";
            }
        }, 1000);

        setTimeout(() => {
            if (
                isDead &&
                respawnText
            ) {
                respawnText.textContent =
                    "Respawning in 1...";
            }
        }, 2000);
    }
);
   

socket.on(
    "playerRespawn",
    (data) => {
        console.log(
            "RESPAWN EVENT RECEIVED"
        );

        player.position.set(
            data.x,
            data.y,
            data.z
        );

        document.getElementById(
            "health"
        ).textContent =
            `HP: ${data.health}`;

        const deathScreen =
            document.getElementById(
                "deathScreen"
            );

        if (deathScreen) {
            deathScreen.style.display =
                "none";
        }

        isDead = false;
    }
);
socket.on(
    "playerKilled",
    (data) => {
        if (
            data.playerId ===
            socket.id
        ) {
            return;
        }

        const deadPlayer =
            otherPlayers[
                data.playerId
            ];

        if (deadPlayer) {
            deadPlayer.visible =
                false;
        }
    }
);

socket.on(
    "playerRespawned",
    (data) => {
        if (
            data.playerId ===
            socket.id
        ) {
            return;
        }

        const respawnedPlayer =
            otherPlayers[
                data.playerId
            ];

        if (
            respawnedPlayer
        ) {
            respawnedPlayer
                .position
                .set(
                    data.x,
                    data.y,
                    data.z
                );

            respawnedPlayer.visible =
                true;
        }
    }
);

function onResize() {
    camera.aspect =
        window.innerWidth /
        window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

}