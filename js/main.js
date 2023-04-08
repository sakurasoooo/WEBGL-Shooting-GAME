'use strict'
// initialize global variables
let renderer, scene, camera, clock; // THREE JS objects
let cube, aimSprite, generater, tip; // THREE JS objects
let bulletMaterial, bulletGeometry, bulletMaterial2, bulletGeometry2; // THREE JS objects

// timers
let lastTime = 0; // record the timestamp, will be updated per frame.
let lockActivateTime = 0; // set interval for re-locking the mouse pointer

// track the particles, remove the particle when it died.
let bullets = []; // store the bullet objects
let bossBullets = []; // store the boss bullet objects 


let pause = true; // bool variable for pausing the game (stop rendering)
let score = 0; // record the score


class Bullet {
    // bullet constructor
    constructor(target, direction) {
        this.target = target; // store the THREE JS Mesh
        this.direction = direction; // a vector 3 
        this.speed = 0.2; // float for speed
        this.time = 0; // The time the particle has been alive
        this.lifeSpan = 10; // seconds, Particle lifetime. if time is greater than lifeSpan, this particle will die.
    }

    // update method will be called per frame
    update() {
        this.time += deltaTime(); // update time

        this.target.translateOnAxis(this.direction, this.speed); //update position

        if (this.time > this.lifeSpan) { // check if this particle die
            this.target.removeFromParent(); // remove from scene
            bullets.splice(bullets.indexOf(this), 1); // remove from tracking list
        } else {
            // check bullet collision
            const raycaster = new THREE.Raycaster(this.target.position, this.direction); // create raycaster
            raycaster.camera = camera; // required property for raycaster.

            const intersects = raycaster.intersectObjects(scene.children); // check the intersected obejcts with the ray.
            if (intersects.length) { // if have intersected obejcts
                for (let i in intersects) {
                    if (intersects[i].object.type == "Mesh") { // it must be a 3d obejct
                        if (intersects[i].distance <= 0.4) { // check the distance 
                            if (intersects[i].object.name == "wall") { // collide with the wall
                                this.target.removeFromParent(); // remove from scene
                                bullets.splice(bullets.indexOf(this), 1); // remove from tracking list
                                break;
                            } else if (intersects[i].object.name == "cube") { // collide with the boss
                                generater.getDamage(); // reduce boss hp
                                if (generater.alive) { // if the boss is still alive
                                    this.target.removeFromParent(); // remove the bullet from scene
                                    bullets.splice(bullets.indexOf(this), 1); // remove the bullet from tracking list

                                    score += 10000; // update score
                                    console.log('Score: ' + score);
                                    let scoreText = score.toString();
                                    $("#cscore").text(scoreText.padStart(10, '0')); // update score for UI
                                } else { // if the boss is dead
                                    intersects[i].object.removeFromParent(); // remove the boss from scene
                                    this.target.removeFromParent(); // remove the bullet from scene
                                    bullets.splice(bullets.indexOf(this), 1); // remove the bullet from tracking list
                                    score += 50000; // update score
                                    console.log('Score: ' + score);
                                    let scoreText = score.toString();
                                    $("#cscore").text(scoreText.padStart(10, '0')); // update score for UI
                                    console.log("You win!");
                                    $("#info").show(); // show win info

                                    // save highest score
                                    setHighestScore(score);

                                    $("#hscore").text(getHighestScore().padStart(10, '0')); // update highest score for UI

                                }
                                break;
                            } else if (intersects[i].object.name == "bossBullet") {
                                intersects[i].object.removeFromParent(); //  remove boss bullet from scene
                                // find and remove boss bullet from list
                                for (let j in bossBullets) {
                                    if (bossBullets[j].target.uuid == intersects[i].object.uuid) {
                                        bossBullets.splice(j, 1);
                                        break;
                                    }
                                }
                                this.target.removeFromParent(); // remove bullet from scene
                                bullets.splice(bullets.indexOf(this), 1); // remove bullet from list

                                score += 100; // update score
                                console.log('Score: ' + score);
                                let scoreText = score.toString();
                                $("#cscore").text(scoreText.padStart(10, '0')); // update score for UI
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
}

class BossBullet {
    constructor(target, direction) {
        this.target = target; // store the THREE JS Mesh
        this.direction = direction; // a vector 3 
        this.speed = 0.01; // float for speed
        this.time = 0; // The time the particle has been alive
        this.lifeSpan = 15; // seconds, Particle lifetime. if time is greater than lifeSpan, this particle will die.
    }
     // update method will be called per frame
    update() {
        this.time += deltaTime(); // update time

        this.target.translateOnAxis(this.direction, this.speed); //update position

        this.target.rotateZ(degreesToRadians(7)); //update rotation


        if (this.time > this.lifeSpan) { // check if this particle die
            this.target.removeFromParent();  // remove from scene
            bossBullets.splice(bossBullets.indexOf(this), 1); // remove from tracking list
        } else {
            // check boss bullet collision , Same as Bullet obejct
            const raycaster = new THREE.Raycaster(this.target.position, this.direction);
            raycaster.camera = camera;
            const intersects = raycaster.intersectObjects(scene.children);
            if (intersects.length) {
                for (let i in intersects) {
                    if (intersects[i].object.type == "Mesh") {
                        if (intersects[i].distance <= 0.1) { // check intersection
                            if (intersects[i].object.name == "wall") {
                                this.target.removeFromParent();
                                bossBullets.splice(bossBullets.indexOf(this), 1);
                                break;
                            } else if (intersects[i].object.name == "player") { // not execute
                                this.target.removeFromParent();
                                bossBullets.splice(bossBullets.indexOf(this), 1);
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
}

// The Boss 
class Generator {
    constructor(target) {
        this.target = target; // THREE JS MESH
        this.direction = new THREE.Vector3(0, 0, 1); // vector 3
        this.speed = 1; // float for speed
        this.time = 0; // living time
        this.alive = true; // state of death
        this.lastFire = 0; //  the time for last shooting
        this.fireInterval = 0.1; // seconds, interval for a shooting action
        this.fire = false; // is allowed to shoot bullets
        this.fireCount = 0; // Number of bullets fired
        this.maxfire = 4; // Number of bullets is allowed to fire in a shooting action
        this.lives = 3; // Health points
    }

    // update method will be called per frame
    update() {
        if (this.lives <= 0) { // update state of death
            this.alive = false
        }

        if (this.alive) { // if the boss is still alive
            this.time += deltaTime(); // update time

            // update rotation and position
            this.target.rotation.x += 0.05;
            this.target.rotation.y += 0.05;
            this.target.position.set(5 * Math.sin(Math.PI * this.time), 3 * Math.cos(3 * Math.PI * this.time), -10);

            //random interval for shooting action
            if (this.time % (Math.random() * 5 + 2) <= 0.01) {
                this.fire = true;
            }

            // if the number of boss bullet in the scene is less than 10
            if (bossBullets.length < 10) {
                if (this.fire) {//if allow to fire
                    if (this.fireCount < this.maxfire) { // if a shooting action has ended
                        if ((this.time - this.lastFire) > this.fireInterval) { // check fire interval
                            this.lastFire = this.time; // update fire time
                            this.fireCount++; // update fire times

                            // create a new boss bullet
                            let newBullet = new THREE.Mesh(bulletGeometry2, bulletMaterial2); // create Mesh
                            newBullet.position.copy(this.target.position); // clone the boss positon
                            newBullet.name = "bossBullet"; // set label
                            bossBullets.push(new BossBullet(newBullet, this.direction)); // add to tracking list
                            scene.add(newBullet); // add to scene
                        }
                    } else {
                        this.fire = false;
                        this.fireCount = 0; //reset the shooting action
                    }
                }
            }
        }
    }

    // Called when the boss is hit
    getDamage() {
        this.lives--;
        if (this.lives <= 0) {
            this.alive = false
        }
        $("#hp").css("width", (this.lives / 3 * 100) + "%"); // update the UI for HP
    }
}


/* 
    initialze all obejcts and build the game
    only call once when open the HTML
*/
function init() {
    clock = new THREE.Clock(); // Three JS clock, no use
    /* 
        add shading
    */
    // create　scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x00BFFF);
    // create camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 2500);
    camera.position.z = 5;
    scene.add(camera);

    // create renderer
    renderer = new THREE.WebGLRenderer();
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.antialias = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.3;
    $(document.body).append(renderer.domElement);

    // create boss box
    const boxGeometry = new THREE.BoxGeometry(2, 2, 2);
    const boxMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x00ff00,
        metalness: 0.4,
        roughness: 0.9,
        clearcoat: 0.9,
        clearcoatRoughness: 0.9,
        reflectivity: 0.9
    });
    cube = new THREE.Mesh(boxGeometry, boxMaterial);
    cube.castShadow = true; //default is false
    cube.receiveShadow = true;
    cube.name = "cube";
    restartGame(); // re-add boss cube into the scene and reset UI info

    // create gun
    const gunBodyGeometry = new THREE.BoxGeometry(0.25, 0.25, 3);
    const gunBodyMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xFF8C00,
        metalness: 0.4,
        roughness: 0.9,
        clearcoat: 0.9,
        clearcoatRoughness: 0.9,
        reflectivity: 0.9
    });
    const gunBody = new THREE.Mesh(gunBodyGeometry, gunBodyMaterial);
    gunBody.castShadow = true; //default is false
    gunBody.receiveShadow = true;
    camera.add(gunBody);
    gunBody.position.set(0.5, -0.5, -1);
    gunBody.rotateOnAxis(new THREE.Vector3(1, 1, 0), 0.25);


    // create aim sprite
    const aimMap = new THREE.TextureLoader().load('textures/aim.png');
    const aimSpriteMaterial = new THREE.SpriteMaterial({
        map: aimMap,
        color: 0xffffff
    });
    aimSprite = new THREE.Sprite(aimSpriteMaterial);
    aimSprite.scale.set(0.25, 0.25, 0.25)
    gunBody.add(aimSprite);
    aimSprite.position.set(-0.007, 0.007, -2)


    // create pause sprite
    const pauseMap = new THREE.TextureLoader().load('textures/pause.png');
    const pauseSpriteMaterial = new THREE.SpriteMaterial({
        map: pauseMap,
        color: 0xffffff
    });
    tip = new THREE.Sprite(pauseSpriteMaterial);
    camera.add(tip);
    tip.position.set(0, 0, -1);


    // init bullet Material
    bulletMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x00FFFF,
        metalness: 0.4,
        roughness: 0.9,
        clearcoat: 0.9,
        clearcoatRoughness: 0.9,
        reflectivity: 0.9
    });
    bulletGeometry = new THREE.SphereGeometry(0.09);

    // init bullet Material2
    bulletMaterial2 = new THREE.MeshPhysicalMaterial({
        color: 0xFF1493,
        metalness: 0.4,
        roughness: 0.9,
        clearcoat: 0.9,
        clearcoatRoughness: 0.9,
        reflectivity: 0.9
    });
    bulletGeometry2 = new THREE.BoxGeometry(1, 1, 1);


    // add lights
    const ambient = new THREE.AmbientLight(0xcccccc);
    ambient.box;
    scene.add(ambient);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(0, 1, 2); //default; light shining from top
    mainLight.castShadow = true; // default false
    scene.add(mainLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.castShadow = true;
    pointLight.position.set(1, 1, -2);
    scene.add(pointLight);


    // add planes(Wall)
    const planeSize = 30;
    const wallGeometry = new THREE.PlaneGeometry();
    const wallMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xF5F5F5,
        metalness: 0.7,
        roughness: 0.9,
        clearcoat: 0.9,
        clearcoatRoughness: 0.9,
        reflectivity: 0.9
    });
    const wall_back = new THREE.Mesh(wallGeometry, wallMaterial);
    const wall_top = new THREE.Mesh(wallGeometry, wallMaterial);
    const wall_bot = new THREE.Mesh(wallGeometry, wallMaterial);
    const wall_right = new THREE.Mesh(wallGeometry, wallMaterial);
    const wall_left = new THREE.Mesh(wallGeometry, wallMaterial);

    scene.add(wall_back);
    wall_back.position.z = -planeSize / 2 - 15;
    wall_back.scale.set(planeSize, planeSize, planeSize);
    wall_back.castShadow = true;
    wall_back.receiveShadow = true;
    wall_back.name = "wall";

    scene.add(wall_top);
    wall_top.rotateX(degreesToRadians(90));
    wall_top.position.y = planeSize / 2;
    wall_top.scale.set(planeSize, planeSize * 2, planeSize);
    wall_top.receiveShadow = true;
    wall_top.name = "wall";

    scene.add(wall_bot);
    wall_bot.rotateX(degreesToRadians(-90));
    wall_bot.position.y = -planeSize / 2;
    wall_bot.scale.set(planeSize, planeSize * 2, planeSize);
    wall_bot.receiveShadow = true;
    wall_bot.name = "wall";

    scene.add(wall_right);
    wall_right.rotateY(degreesToRadians(-90));
    wall_right.position.x = planeSize / 2;
    wall_right.scale.set(planeSize * 2, planeSize, planeSize);
    wall_right.receiveShadow = true;
    wall_right.name = "wall";

    scene.add(wall_left);
    wall_left.rotateY(degreesToRadians(90));
    wall_left.position.x = -planeSize / 2;
    wall_left.scale.set(planeSize * 2, planeSize, planeSize);
    wall_left.receiveShadow = true;
    wall_left.name = "wall";


    // lock cursor
    $('canvas').on('click', function (e) {
        // wait lock exit process complete
        if (document.pointerLockElement !== $('canvas')[0] && (performance.now() - lockActivateTime) > 2500) {
            e.target.requestPointerLock();
            lockActivateTime = performance.now();
        }
    });

    //on lock cursor
    $(document).on('pointerlockchange', function (e) {
        if (document.pointerLockElement === $('canvas')[0]) {
            pause = false; // start the game 
            tip.removeFromParent()
            // add keyboard and mouse listeners
            $('canvas').on('mousemove', cameraControl);
            $(window).on('keydown', keyboardControl);
            $(window).on('mousedown', mouseControl);
        } else {
            pause = true;
            camera.add(tip)
            // remove keyboard and mouse listeners
            $('canvas').off('mousemove', cameraControl);
            $(window).off('keydown', keyboardControl);
            $(window).off('mousedown', mouseControl);
        }
    });

    //adaptive canvas
    $(window).on('resize', onWindowResize);
}

/* 
    THREE JS helper function,
    will be called per frame, frame is controlled by THREE JS
*/
function animate() {
    //request refresh 
    requestAnimationFrame(animate);
    if (!pause) {

        update(); // update the boss and bullets

    }

    render(); // re-render the scene
};


/* 
    update the boss and bullets
    call the update method of these obejects
*/
function update() {
    // animation here
    if (generater.alive) {
        generater.update();
    }


    //update bullet
    if (bullets.length > 0) {
        for (let b of bullets) {
            b.update();

        }
    }
    //update boss bullet
    if (bossBullets.length > 0) {
        for (let b of bossBullets) {
            b.update();

        }
    }

}

/* 
    update the timestamp and rendre the scene and camera
*/
function render() {
    lastTime = performance.now(); //update timestamp
    // Render the frame
    renderer.render(scene, camera);
}

/* 
    reset the state of the game 
*/
function restartGame() {
    score = 0; // reset score
    $("#info").hide(); // reset info
    $("#cscore").text("".padStart(10, '0')); // reset UI for current score
    $("#hscore").text(getHighestScore().padStart(10, '0')); // reset UI for highest score
    $("#hp").css("width", "100%"); // reset UI for Boss HP

    // reset the boss
    cube.removeFromParent(); 
    scene.add(cube);
    generater = new Generator(cube);
}

/* 
    helper function to create mouse listener to control the camera rotation

*/
function cameraControl(e) {
    const pitchSpeed = 2.5; // vertical speed
    const yawSpeed = 3.5; // horizontal speed

    // camera rotate on X axis ,based on the elapsed time between two frame
    camera.rotateX(-(Math.sign(e.originalEvent.movementY) * pitchSpeed * deltaTime()));
    camera.rotation.x = degreesToRadians(clamp(RadiansTodDegrees(camera.rotation.x), 45, -45)); // lock the angle of camera

    // camera rotate on Y axis
    camera.rotateY(-(Math.sign(e.originalEvent.movementX) * yawSpeed * deltaTime()));
    camera.rotation.y = degreesToRadians(clamp(RadiansTodDegrees(camera.rotation.y), 60, -60)); // lock the angle of camera

    // camera rotate on Z axis
    // FIX: fixed uncorrect camera rotation on Z-aixs, Make the camera more intuitive to the human eye.
    camera.rotation.z = (camera.rotation.x) * (-1 * camera.rotation.y);
    camera.rotation.z = degreesToRadians(clamp(RadiansTodDegrees(camera.rotation.z), 8.7, -8.7));

}

/* 
    helper function to create mouse left click listener for firing bullet

*/
function mouseControl(e) {

    //get the direction of bullet
    let direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    //get the postion of bullet
    let postion = new THREE.Vector3(0, 0, 3);
    aimSprite.getWorldPosition(postion);

    //create bullet
    creatBullet(direction, postion);
}


/* 
    helper function to add keyboard listener for restarting the game

*/
function keyboardControl(e) {

    switch (e.keyCode) {
        case 82: // R
            restartGame();
            break;
    }
}

/* 
    create the bullet and add it to the scene and list

*/
function creatBullet(direction, position) {

    if (bullets.length < 10) {
        let newBullet = new THREE.Mesh(bulletGeometry, bulletMaterial); // create Mesh
        newBullet.position.copy(position); // set postion
        newBullet.name = "bullet"; // add label 
        bullets.push(new Bullet(newBullet, direction)); // add to list
        scene.add(newBullet); // add to scene
    }
}


/* 
    resize the game canvas when the windows size is changed
*/
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

/* 
    convert degrees to radians
*/
function degreesToRadians(degrees) {
    // return degrees * (Math.PI / 180);
    return THREE.Math.degToRad(degrees)
}


/* 
    convert radians to degrees
*/
function RadiansTodDegrees(radians) {
    // return radians * (180 / Math.PI);
    return THREE.Math.radToDeg(radians);
}

/* 
    get elapsed time from last frame
*/
function deltaTime() {
    return (performance.now() - lastTime) / 1000;
}


/* 
    Limit the value to between two values.
*/
function clamp(degrees, max, min) {
    // return Math.min(Math.max(degrees, min), max);
    return THREE.Math.clamp(degrees, min, max);
}

/* 
    get the score from localstorage
*/
function getHighestScore() {
    const hScore = localStorage.getItem('hScore');
    return hScore ? hScore : '0'; // return '0' if the score is not exist
}

/* 
    set the score to localstorage
*/
function setHighestScore(score) {
    const hScore = localStorage.getItem('hScore');
    localStorage.setItem('hScore', Math.max(parseInt(hScore ? hScore : '0'), score).toString());
}


// Start Game
/* 
    check if the explorer support WebGL
*/
if (WebGL.isWebGLAvailable()) {
    // Initiate function or other initializations here
    init();
    animate();
} else {
    const warning = WebGL.getWebGLErrorMessage();
    $(document.body).append(warning);
}
