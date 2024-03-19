import * as THREE from 'three';

import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js';

THREE.Cache.enabled = true;

const textureLoader = new THREE.TextureLoader();

var loader = new ColladaLoader();

var playermodel = null;
var worldmodel = null;

var scene = new THREE.Scene();

var ambientLight = new THREE.AmbientLight( 0xffffff );
scene.add( ambientLight );

var directionalLight = new THREE.DirectionalLight( 0xffffff, 2.5 );
directionalLight.position.set( 1, 1, 0 ).normalize();
scene.add( directionalLight );

var camera = new THREE.PerspectiveCamera( 75, 16/9, 0.1, 1000 );

camera.rotation.x = 0;
camera.rotation.y = 0;
camera.rotation.z = 0;

var renderer = new THREE.WebGLRenderer();
renderer.setSize( 1280, 720 );

var server_ref;

var myuser;

var player_ref;

var all_players_ref;

var pressedKeys = {};
window.addEventListener('keyup', (e) => pressedKeys[e.key] = false);
window.addEventListener('keydown', (e) => pressedKeys[e.key] = true);


var players = {};
var models = {};

var textures = {};

var hosting = false;
var playing = false;

loadModelAndReturn("bigcity.dae",0);
loadModelAndReturn("player.dae",1);

function loadModelAndReturn(modelURL, addedPlayerId) {
    console.log("loading model" + modelURL);
    
    // Creating a Promise to handle the asynchronous loading
    new Promise((resolve, reject) => {
        // Using loader.load to load the model from the provided URL
        loader.load(modelURL, function(collada) {
            // When the model is loaded successfully, it's stored in models array
            const model = collada.scene;
            console.log(model);
            models[addedPlayerId] = model;
            resolve(model); // Resolving the Promise with the loaded model
        }, undefined, reject); // Rejecting the Promise if there's an error
    }).then(() => {
        console.log("returning loading model");
        // After resolving the Promise, returning the loaded model
    }).catch((error) => {
        // Handling any errors that occurred during loading
        console.error("Error loading model:", error);
        throw error; // Re-throwing the error to be handled by the caller
    });
        console.log(models[addedPlayerId]);
	
	return models[addedPlayerId];
}

(function () {
	firebase.auth().signInAnonymously().catch((error) => {
		var errorCode = error.code;
		var errorMessage = error.message;
		console.log(errorCode,errorMessage);
	});
	
	firebase.auth().onAuthStateChanged((user)=>{
		if(user){
			myuser = user;
		}else{
		
		}
		console.log(myuser);
		
	})
})();

function init_player(servername){
	var texturelink = document.getElementById('texture_link');
	if(texturelink.value.length<1){
		texturelink.value="https://thumbs.dreamstime.com/b/happy-man-thumbs-up-sign-full-length-portrait-white-background-showing-31416426.jpg";
	}
	
	player_ref = firebase.database().ref("servers/"+servername+"/players/"+myuser.uid);
	player_ref.set({
		id: myuser.uid,
		name: "bucko",
		texlink: texturelink.value,
		x: 0,
		y: 0,
		z: 0,
		xrot: 0,
		yrot: 0,
		zrot: 0
	});
	player_ref.onDisconnect().remove();
	
	all_players_ref = firebase.database().ref("servers/"+servername+"/players");
	
	all_players_ref.on("value", (snapshot) => {
		players = snapshot.val() || {};
		Object.keys(players).forEach((key) => {
			var playerstate = players[key];
			if(playerstate.id != player_ref.id){
				if(models[playerstate.id]){
				models[playerstate.id].position.x=playerstate.x;
				models[playerstate.id].position.y=playerstate.y;
				models[playerstate.id].position.z=playerstate.z;
				models[playerstate.id].rotation.x=playerstate.xrot;
				models[playerstate.id].rotation.y=playerstate.yrot;
				models[playerstate.id].rotation.z=playerstate.zrot;
				//textures[addedPlayer.id] = textureLoader.load(addedplayer.texlink);
				}
			}
		})
	})
	
	
	
	all_players_ref.on("child_added", (snapshot) => {
		var addedplayer = snapshot.val();
		if(addedplayer.id != player_ref.id){
			
			textures[addedplayer.id] = textureLoader.load(addedplayer.texlink);
			
			// Create geometry for the quad
			var geometry = new THREE.PlaneGeometry(2, 2);
			geometry.rotateY(Math.PI);

			// Create material with the loaded texture
			var material = new THREE.MeshBasicMaterial({ map: textures[addedplayer.id], side: THREE.DoubleSide });

			// Create a mesh with the geometry and material
			models[addedplayer.id] = new THREE.Mesh(geometry, material);
			console.log(models[addedplayer.id]);
			
			scene.add(models[addedplayer.id]);
			models[addedplayer.id].position.set(0,0,0);
		}	
	})
}

function init_server(){

	server_ref = firebase.database().ref("servers/"+myuser.uid);
	server_ref.set({
		a: "a"
	});
	
	server_ref.onDisconnect().remove();
	
	init_player(myuser.uid);
	
	document.body.appendChild( renderer.domElement );
	
	var message = document.createElement('p');
	message.textContent = myuser.uid;
	document.body.appendChild(message);
	
	animate();
}

function init_client(){
	var servername = document.getElementById('server_id');
	if(servername.value.length<1){
		return;
	}
	
	server_ref = firebase.database().ref("servers/"+servername.value);
	
	init_player(servername.value);
	
	document.body.appendChild( renderer.domElement );
	
	var message = document.createElement('p');
	message.textContent = "joined server!";
	document.body.appendChild(message);
	
	animate();
}

function update(){
	if(pressedKeys["w"]){
		camera.position.x += (-Math.sin(camera.rotation.y)*Math.cos(camera.rotation.x))*0.3;
		camera.position.z += (-Math.cos(camera.rotation.y)*Math.cos(camera.rotation.x))*0.3;
		camera.position.y += (Math.sin(camera.rotation.x))*0.3;
	}else if(pressedKeys["s"]){
		camera.position.x -= (-Math.sin(camera.rotation.y)*Math.cos(camera.rotation.x))*0.3;
		camera.position.z -= (-Math.cos(camera.rotation.y)*Math.cos(camera.rotation.x))*0.3;
		camera.position.y -= (Math.sin(camera.rotation.x))*0.3;
	}
	if(pressedKeys["a"]){
		camera.rotation.y+=0.05;
	}else if(pressedKeys["d"]){
		camera.rotation.y-=0.05;
	}
	
	if(players[myuser.uid]){
		players[myuser.uid].x = camera.position.x;
		players[myuser.uid].y = camera.position.y;
		players[myuser.uid].z = camera.position.z;
		players[myuser.uid].xrot = camera.rotation.x;
		players[myuser.uid].yrot = camera.rotation.y;
		players[myuser.uid].zrot = camera.rotation.z;
		
		player_ref.set(players[myuser.uid]);
	}
}

function animate() {
	
	requestAnimationFrame( animate );
	renderer.render( scene, camera );
	update();
}

document.getElementById('host').addEventListener('click', function(event) {
	if(!hosting){
	init_server();
	console.log(models[0]);
	scene.add(models[0]);
	hosting=true;
	playing=false;
	}
});

document.getElementById('join').addEventListener('click', function(event) {
	if(!playing){
	init_client();
	scene.add(models[0]);
	playing=true;
	}
});

document.getElementById('disconnect').addEventListener('click', function(event) {
	var message = document.createElement('p');
	message.textContent = "reload the page!";
	document.body.appendChild(message);
});