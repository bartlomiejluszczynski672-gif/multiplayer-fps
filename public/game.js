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
const spawnPoints = [
    { x: -35, y: 0.9, z: -35 },
    { x: 35, y: 0.9, z: -35 },
    { x: -35, y: 0.9, z: 35 },
    { x: 35, y: 0.9, z: 35 },
    { x: -20, y: 0.9, z: 0 },
    { x: 20, y: 0.9, z: 0 }
];
const colliders = [];
let currentMap = "grass";
const playerSpeed = 0.12;

let lastNetworkUpdate = 0;
let weaponBobTime = 0;
let kills = 0;
let deaths = 0;
let isDead = false;
let currentHostId = null;

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
    if (currentMap === "grass") {
        createGrassMap();
    }

    if (currentMap === "industrial") {
        createIndustrialMap();
    }
}

function createGrassMap() {
    // =========================
    // GRASS GROUND
    // =========================

    const groundGeometry =
        new THREE.BoxGeometry(
            100,
            1,
            100
        );

    const groundMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x4f7d3a,
            roughness: 1
        });

    const ground =
        new THREE.Mesh(
            groundGeometry,
            groundMaterial
        );

    ground.position.y = -0.5;

    scene.add(ground);


    // =========================
    // OUTER WALLS / MAP BORDER
    // =========================

    createBox(
        0, 2, -48,
        96, 4, 2,
        0x5e5e5e
    );

    createBox(
        0, 2, 48,
        96, 4, 2,
        0x5e5e5e
    );

    createBox(
        -48, 2, 0,
        2, 4, 96,
        0x5e5e5e
    );

    createBox(
        48, 2, 0,
        2, 4, 96,
        0x5e5e5e
    );


    // =========================
    // CENTRAL BUILDING
    // =========================

    createBox(
        0, 2.5, -10,
        18, 5, 10,
        0x777777
    );

    createBox(
        -10, 2, -10,
        2, 4, 18,
        0x555555
    );

    createBox(
        10, 2, -10,
        2, 4, 18,
        0x555555
    );


    // =========================
    // LEFT SIDE
    // =========================

    createBox(
        -25, 2, 0,
        10, 4, 12,
        0x6f6f6f
    );

    createBox(
        -28, 1, 14,
        6, 2, 6,
        0x765437
    );

    createBox(
        -18, 1, 18,
        5, 2, 5,
        0x765437
    );


    // =========================
    // RIGHT SIDE
    // =========================

    createBox(
        25, 2, 0,
        10, 4, 12,
        0x6f6f6f
    );

    createBox(
        28, 1, 14,
        6, 2, 6,
        0x765437
    );

    createBox(
        18, 1, 18,
        5, 2, 5,
        0x765437
    );


    // =========================
    // MIDDLE COVER
    // =========================

    createBox(
        -8, 0.8, 5,
        4, 1.6, 4,
        0x765437
    );

    createBox(
        8, 0.8, 5,
        4, 1.6, 4,
        0x765437
    );

    createBox(
        0, 0.8, 14,
        5, 1.6, 5,
        0x765437
    );


    // =========================
    // STONE WALLS
    // =========================

    createBox(
        -15, 1.25, -25,
        12, 2.5, 2,
        0x808080
    );

    createBox(
        15, 1.25, -25,
        12, 2.5, 2,
        0x808080
    );


    // =========================
    // SMALL BUNKER
    // =========================

    createBox(
        0, 1.5, 30,
        14, 3, 6,
        0x555555
    );


    // =========================
    // TREES
    // =========================

    createTree(
        -35,
        -30
    );

    createTree(
        35,
        -30
    );

    createTree(
        -35,
        30
    );

    createTree(
        35,
        30
    );

    createTree(
        -20,
        30
    );

    createTree(
        20,
        30
    );
}
function createIndustrialMap() {
    // CONCRETE GROUND
    const groundGeometry = new THREE.BoxGeometry(100, 1, 100);

    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x55575a,
        roughness: 0.95,
        metalness: 0.05
    });

    const ground = new THREE.Mesh(
        groundGeometry,
        groundMaterial
    );

    ground.position.y = -0.5;
    scene.add(ground);

    // OUTER WALLS
    createBox(0, 3, -48, 96, 6, 2, 0x3f4144);
    createBox(0, 3, 48, 96, 6, 2, 0x3f4144);
    createBox(-48, 3, 0, 2, 6, 96, 0x3f4144);
    createBox(48, 3, 0, 2, 6, 96, 0x3f4144);

    // LARGE WAREHOUSE
    createBox(
    0, 4, -24,
    32, 8, 16,
    0x66696d,
);

    // SIDE BUILDINGS
    createBox(-30, 3, 5, 14, 6, 22, 0x5f6266);
    createBox(30, 3, 5, 14, 6, 22, 0x5f6266);

    // CENTER WALLS
    createBox(-10, 1.6, -2, 2, 3.2, 16, 0x44484c);
    createBox(10, 1.6, -2, 2, 3.2, 16, 0x44484c);

    // RED CONTAINERS
    createBox(-18, 1.4, 22, 10, 2.8, 4, 0x8a3434);
    createBox(-18, 1.4, 28, 10, 2.8, 4, 0x8a3434);

    // BLUE CONTAINERS
    createBox(18, 1.4, 22, 10, 2.8, 4, 0x345c7d);
    createBox(18, 1.4, 28, 10, 2.8, 4, 0x345c7d);

    // CENTER COVER
createBox(0, 1, 16, 6, 2, 6, 0x4d4f52);
createBox(-8, 1, 20, 4, 2, 4, 0x4d4f52);
createBox(8, 1, 20, 4, 2, 4, 0x4d4f52);

    // METAL BARRIERS
    createBox(-25, 1.1, -12, 12, 2.2, 1, 0x777b80);
    createBox(25, 1.1, -12, 12, 2.2, 1, 0x777b80);

    // STORAGE BLOCKS
    createBox(-6, 1.2, 32, 5, 2.4, 5, 0x686868);
    createBox(6, 1.2, 32, 5, 2.4, 5, 0x686868);

    // FACTORY TOWERS
    createBox(-40, 4, -18, 6, 8, 6, 0x56595c);
createBox(40, 4, -18, 6, 8, 6, 0x56595c);
}
function createBox(
    x, y, z,
    width, height, depth,
    color = 0x777777,
    hasCollision = true
) {
    function createTree(
    x,
    z
) {
    // TRUNK
    const trunkGeometry =
        new THREE.CylinderGeometry(
            0.45,
            0.6,
            4,
            8
        );

    const trunkMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x6b4423,
            roughness: 1
        });

    const trunk =
        new THREE.Mesh(
            trunkGeometry,
            trunkMaterial
        );

    trunk.position.set(
        x,
        2,
        z
    );

    scene.add(trunk);

    trunk.updateMatrixWorld(true);

    const trunkCollider =
        new THREE.Box3()
            .setFromObject(
                trunk
            );

    colliders.push(
        trunkCollider
    );


    // TREE TOP
    const leavesGeometry =
        new THREE.SphereGeometry(
            2.2,
            10,
            8
        );

    const leavesMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x2f6b32,
            roughness: 1
        });

    const leaves =
        new THREE.Mesh(
            leavesGeometry,
            leavesMaterial
        );

    leaves.position.set(
        x,
        5,
        z
    );

    scene.add(leaves);
}
    const geometry = new THREE.BoxGeometry(
        width,
        height,
        depth
    );

    const material =
    new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.9
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

box.updateMatrixWorld(true);

if (hasCollision) {
    const boxCollider =
        new THREE.Box3().setFromObject(box);

    colliders.push(boxCollider);
}

return box;
}
function createTree(x, z) {
    const trunkGeometry =
        new THREE.CylinderGeometry(
            0.45,
            0.6,
            4,
            8
        );

    const trunkMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x6b4423,
            roughness: 1
        });

    const trunk =
        new THREE.Mesh(
            trunkGeometry,
            trunkMaterial
        );

    trunk.position.set(
        x,
        2,
        z
    );

    scene.add(trunk);

    trunk.updateMatrixWorld(true);

    const trunkCollider =
        new THREE.Box3()
            .setFromObject(trunk);

    colliders.push(
        trunkCollider
    );

    const leavesGeometry =
        new THREE.SphereGeometry(
            2.2,
            10,
            8
        );

    const leavesMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x2f6b32,
            roughness: 1
        });

    const leaves =
        new THREE.Mesh(
            leavesGeometry,
            leavesMaterial
        );

    leaves.position.set(
        x,
        5,
        z
    );

    scene.add(leaves);
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

    // SLIDE / UPPER PART
    const slideGeometry =
        new THREE.BoxGeometry(
            0.22,
            0.16,
            0.62
        );

    const slideMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x202020,
            metalness: 0.4,
            roughness: 0.5
        });

    const slide =
        new THREE.Mesh(
            slideGeometry,
            slideMaterial
        );

    slide.position.set(
        0.28,
        -0.22,
        -0.65
    );

    weapon.add(slide);

    // BARREL
    const barrelGeometry =
        new THREE.BoxGeometry(
            0.09,
            0.09,
            0.38
        );

    const barrelMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x111111,
            metalness: 0.6,
            roughness: 0.4
        });

    const barrel =
        new THREE.Mesh(
            barrelGeometry,
            barrelMaterial
        );

    barrel.position.set(
        0.28,
        -0.20,
        -1.0
    );

    weapon.add(barrel);

    // GRIP
    const gripGeometry =
        new THREE.BoxGeometry(
            0.16,
            0.38,
            0.18
        );

    const gripMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x151515,
            roughness: 0.8
        });

    const grip =
        new THREE.Mesh(
            gripGeometry,
            gripMaterial
        );

    grip.position.set(
        0.28,
        -0.43,
        -0.52
    );

    grip.rotation.x =
        -0.18;

    weapon.add(grip);

    // TRIGGER GUARD
    const guardGeometry =
        new THREE.BoxGeometry(
            0.16,
            0.07,
            0.12
        );

    const guard =
        new THREE.Mesh(
            guardGeometry,
            slideMaterial
        );

    guard.position.set(
        0.28,
        -0.33,
        -0.67
    );

    weapon.add(guard);

    // FRONT SIGHT
    const sightGeometry =
        new THREE.BoxGeometry(
            0.04,
            0.05,
            0.04
        );

    const sight =
        new THREE.Mesh(
            sightGeometry,
            slideMaterial
        );

    sight.position.set(
        0.28,
        -0.11,
        -0.91
    );

    weapon.add(sight);

    // HAND
    const handGeometry =
        new THREE.BoxGeometry(
            0.20,
            0.28,
            0.22
        );

    const handMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xc58f6a,
            roughness: 0.9
        });

    const hand =
        new THREE.Mesh(
            handGeometry,
            handMaterial
        );

    hand.position.set(
        0.28,
        -0.55,
        -0.48
    );

    hand.rotation.x =
        -0.12;

    weapon.add(hand);

    camera.add(weapon);
    scene.add(camera);
}
function updateWeaponModel() {
    if (!weapon) return;

    weapon.rotation.set(
        0,
        0,
        0
    );

    weapon.position.set(
        0,
        0,
        0
    );

    weapon.scale.set(
        1,
        1,
        1
    );

    if (
        currentWeaponKey ===
        "pistol"
    ) {
        weapon.scale.set(
            1,
            1,
            1
        );
    }

    if (
        currentWeaponKey ===
        "heavyPistol"
    ) {
        weapon.scale.set(
            1.3,
            1.2,
            1.35
        );

        weapon.rotation.z =
            -0.03;
    }
}
function setupControls() {
    document.addEventListener("keydown", (event) => {
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
    });

    document.addEventListener("keyup", (event) => {
        keys[event.code] = false;
    });

    document.addEventListener("mousemove", (event) => {
        if (document.pointerLockElement !== document.body) {
            return;
        }

        yaw -= event.movementX * 0.002;
        pitch -= event.movementY * 0.002;

        pitch = Math.max(
            -Math.PI / 2,
            Math.min(Math.PI / 2, pitch)
        );
    });

    document.addEventListener("mousedown", (event) => {
        if (
            event.button === 0 &&
            document.pointerLockElement === document.body
        ) {
            shoot();
        }
    });

    const mapButtons =
        document.querySelectorAll(".mapButton");

    mapButtons.forEach((button) => {
        button.addEventListener("click", () => {
            currentMap = button.dataset.map;

            socket.emit("selectMap", currentMap);

            mapButtons.forEach((otherButton) => {
                otherButton.classList.remove("selected");
            });

            button.classList.add("selected");

            console.log(
                "Selected map:",
                currentMap
            );
        });
    });

    document
        .getElementById("startButton")
        .addEventListener("click", () => {
            createMap();

            document.body.requestPointerLock();

            document.getElementById(
                "startScreen"
            ).style.display = "none";
        });

    renderer.domElement.addEventListener("click", () => {
        if (isDead) return;

        if (
            document.pointerLockElement !==
            document.body
        ) {
            document.body.requestPointerLock();
        }
    });
}
function canPlayerMoveTo(
    newX,
    newZ
) {
    const mapLimit = 48;

if (
    newX < -mapLimit ||
    newX > mapLimit ||
    newZ < -mapLimit ||
    newZ > mapLimit
) {
    return false;
}
    const playerRadius = 0.35;

    const playerBox =
        new THREE.Box3(
            new THREE.Vector3(
                newX - playerRadius,
                0,
                newZ - playerRadius
            ),
            new THREE.Vector3(
                newX + playerRadius,
                1.8,
                newZ + playerRadius
            )
        );

    for (const collider of colliders) {
    if (playerBox.intersectsBox(collider)) return false;
}

    return true;
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

        const moveX =
    direction.x * playerSpeed;

const moveZ =
    direction.z * playerSpeed;

const newX =
    player.position.x + moveX;

const newZ =
    player.position.z + moveZ;

if (
    canPlayerMoveTo(
        newX,
        player.position.z
    )
) {
    player.position.x =
        newX;
}

if (
    canPlayerMoveTo(
        player.position.x,
        newZ
    )
) {
    player.position.z =
        newZ;
}
    }
    if (
    weapon &&
    !isReloading
) {
    const isMoving =
        direction.length() > 0;

    if (isMoving) {
        weapon.position.x =
            Math.sin(
                weaponBobTime
            ) * 0.015;

        weapon.position.y =
            Math.abs(
                Math.cos(
                    weaponBobTime
                )
            ) * 0.012;
    } else {
        weapon.position.x *= 0.85;
        weapon.position.y *= 0.85;
    }
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

    if (!weapon) return;

    weapon.position.z += 0.10;
    weapon.rotation.x -= 0.08;

    setTimeout(() => {
        if (!weapon) return;

        weapon.position.z -= 0.10;
        weapon.rotation.x += 0.08;
    }, 70);
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

socket.on("lobbyPlayers", (players) => {
    latestLobbyPlayers = players;
    updateLobbyPlayerList();
});
let latestLobbyPlayers = {};
function updateLobbyPlayerList() {
    const playerList =
        document.getElementById("playerList");

    if (!playerList) return;

    playerList.innerHTML = "";

    console.log("MY SOCKET:", socket.id);
    console.log("CURRENT HOST:", currentHostId);
    console.log("PLAYERS:", latestLobbyPlayers);

    Object.values(latestLobbyPlayers).forEach((playerData) => {
        const playerElement =
            document.createElement("div");

        playerElement.className =
            "lobbyPlayer";

        let playerText = "";

        if (playerData.id === socket.id) {
            playerText = "YOU";
        } else {
            playerText = "PLAYER";
        }

        if (playerData.id === currentHostId) {
            playerText += " 👑 HOST";
        }

        playerElement.textContent =
            playerText;

        playerList.appendChild(
            playerElement
        );
    });
}
socket.on("hostChanged", (hostId) => {
    console.log("RECEIVED HOST:", hostId);

    currentHostId = hostId;

    updateLobbyPlayerList();
});
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