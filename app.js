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
var model_velocities = {};
var model_rotvelocities = {};

var textures = {};

var hosting = false;
var playing = false;

var down =  new THREE.Vector3( 0, -1, 0 );

var timer=0;

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
		texturelink.value="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAYUExURQAAAP/MmP+Y//8ymJiYmP////+YmAAAAJnb/gcAAAAIdFJOU/////////8A3oO9WQAAAAlwSFlzAAAOwwAADsMBx2+oZAAAALpJREFUOE/VkVEShCAMQ+vqwv1vbJI2KDKz+22GoZS8UtDof/QuIJ7yvuP2VDkO2PncNYgLSGPXgBbAxtAKWBGCAfCmKxDHAYIAV/m6C0AltkVsWgDAjDCdwC0adYJSAnlLGRaAOsMn7JNPB/1JbH4lgW9SDPrkbDjuQE/9Q0EAkQT0iNZUT7VWAF7hHgJYyjEBbpI9JCzqSyLhH06RKMEVcCuaRa8AJDrR6chyEpwVlXPKteYfegHQ+wl8JBIzbTMvRQAAAABJRU5ErkJggg==";
	}
	
	player_ref = firebase.database().ref("servers/"+servername+"/players/"+myuser.uid);
	player_ref.set({
		id: myuser.uid,
		name: "bucko",
		texlink: texturelink.value,
		x: 0,
		y: 0,
		z: 0,
		xv: 0,
		yv: 0,
		zv: 0,
		xrot: 0,
		xrotv: 0,
		yrot: 0,
		yrotv: 0,
		zrot: 0,
		zrotv: 0
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
				model_velocities[playerstate.id].x=playerstate.xv;
				model_velocities[playerstate.id].y=playerstate.yv;
				model_velocities[playerstate.id].z=playerstate.zv;
				
				models[playerstate.id].rotation.x=playerstate.xrot;
				models[playerstate.id].rotation.y=playerstate.yrot;
				models[playerstate.id].rotation.z=playerstate.zrot;
				model_rotvelocities[playerstate.id].x=playerstate.xrotv;
				model_rotvelocities[playerstate.id].y=playerstate.yrotv;
				model_rotvelocities[playerstate.id].z=playerstate.zrotv;
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
			model_velocities[addedplayer.id]= new THREE.Vector3(0,0,0);
			model_rotvelocities[addedplayer.id]= new THREE.Vector3(0,0,0);
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
	var xv;
	var yv;
	var zv;
	
	var oldpos = camera.position;
	var oldrot = camera.rotation;
	
	if(pressedKeys["a"]){
		camera.rotation.y+=0.05;
	}else if(pressedKeys["d"]){
		camera.rotation.y-=0.05;
	}
	
	if(pressedKeys["w"]){
		xv= (-Math.sin(camera.rotation.y)*Math.cos(camera.rotation.x))*0.3;
		zv= (-Math.cos(camera.rotation.y)*Math.cos(camera.rotation.x))*0.3;
		yv= (Math.sin(camera.rotation.x))*0.3;
	}else if(pressedKeys["s"]){
		xv= -(-Math.sin(camera.rotation.y)*Math.cos(camera.rotation.x))*0.3;
		zv= -(-Math.cos(camera.rotation.y)*Math.cos(camera.rotation.x))*0.3;
		yv= -(Math.sin(camera.rotation.x))*0.3;
	}
	
	
	
	var raycaster = new THREE.Raycaster();
	
	camera.position.x+=xv;
	camera.position.y+=0;
	camera.position.z+=zv;
	
	raycaster.set(camera.position,down);

	var intersects = raycaster.intersectObjects( scene.children );

	if ( intersects.length > 0 ) {
		//console.log(intersects[0]);
		camera.position.y=intersects[0].point.y+1;
	}
	
	var velocity = oldpos-camera.position;
	var rvelocity = oldrot-camera.rotation;
	
	timer++;
	
	if(players[myuser.uid] && timer>20 && (velocity.distance>0 || rvelocity.distance>0)){
		players[myuser.uid].x = camera.position.x;
		players[myuser.uid].y = camera.position.y;
		players[myuser.uid].z = camera.position.z;
		players[myuser.uid].xv = velocity.x;
		players[myuser.uid].yv = velocity.y;
		players[myuser.uid].zv = velocity.z;
		players[myuser.uid].xrot = camera.rotation.x;
		players[myuser.uid].yrot = camera.rotation.y;
		players[myuser.uid].zrot = camera.rotation.z;
		players[myuser.uid].xrotv = rvelocity.x;
		players[myuser.uid].yrotv = rvelocity.y;
		players[myuser.uid].zrotv = rvelocity.z;
		
		player_ref.set(players[myuser.uid]);
		
		timer=0;
	}
	/*
	Object.keys(models).forEach((key) => {
		if(model_velocities[key]){
			if(key != player_ref.id){
				models[key].position.x=models[key].position.x+model_velocities[key].x;
				models[key].position.y=models[key].position.y+model_velocities[key].y;
				models[key].position.z=models[key].position.z+model_velocities[key].z;
				
				models[key].rotation.x=models[key].rotation.x+model_rotvelocities[key].x;
				models[key].rotation.y=models[key].rotation.y+model_rotvelocities[key].y;
				models[key].rotation.z=models[key].rotation.z+model_rotvelocities[key].z;
			}
		//textures[addedPlayer.id] = textureLoader.load(addedplayer.texlink);
		}
	})
	*/
	
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