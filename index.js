var port = "8003";
var url = 'http://localhost:' + port;
var socketio = require('socket.io-client');
var socket = socketio(url);
var command;  //socket to send commands on
var initData;
var selectedPlayer;


var connected = false;

var playerSelection;
if (process.argv[2]) {
	playerSelection = parseInt(process.argv[2], 10);
}

var enemyBases = [];
var myTanks = [];
var allBases = [];
var myBase = {};
var enemyFlags = [];
var enemyTanks = [];
var allObstacles = [];
var allTanks = [];

socket.on("init", function (initD) {
	if (connected) {
		return false;
	}
	socket.on("disconnect", function() {
		//process.exit(1);
	});
	connected = true;
	initData = initD;
	selectedPlayer = initData.players[playerSelection];
	command = socketio(url + "/" + selectedPlayer.namespace);
	enemyBases = initData.players.filter(function(p) {
		return selectedPlayer.playerColor !== p.playerColor;
	});
	myBase = initData.players.filter(function (p) {
	    return selectedPlayer.playerColor == p.playerColor;
	})[0].base;

	allBases = initData.players;
	//allObstacles = initData.boundaries;
    //	throw new Error();
	allTanks = serverTanks;
	var serverTanks = initData.tanks.filter(function(t) {
	    return selectedPlayer.playerColor === t.color;
	});
	for (var i = 0; i < serverTanks.length; i++) {
		myTanks.push(new Tank(i));
	}
	//enemyFlags = initData.Flags.filter(function (t) {
	//    return selectedPlayer.playerColor !== p.playerColor;
	//});
	//for (var i = 0; i < enemyFlags.length; i++)
	//{
    //    if (enemyFlags[i].)
	//}
	setTimeout(function() {
		startInterval();
	}, 2000);

});


/*** AI logic goes after here ***/

/** send back to server **/
function startInterval() {
	setInterval(function() {
		sendBackCommands();
	}, 500);

	//setInterval(function() {
	//	fire();
	//}, 500);
}

function sendBackCommands() {
	//add up all calculations
	var speed, angleVel, orders;
	for (var i = 0; i < myTanks.length; i++) {
		speed = myTanks[i].goal.speed * 1;
		angleVel = myTanks[i].goal.angleVel * 1;
		orders = {
			tankNumbers: [myTanks[i].tankNumber], //an array of numbers e.g. [0,1,2,3]
			speed: myTanks[i].getSpeed(),                         //speed of tank value of -1 to 1, numbers outside of this range will default to -1 or 1, whichever is closer.
			angleVel: myTanks[i].getAngelVel()                    //turning speed of tank positive turns right, negative turns left
		}
		command.emit("move", orders);
	}
}

function fire() {
	var orders = {
		tankNumbers: [0,1,2,3]
	}
	command.emit("fire", orders);
}

/** recieve from server **/
socket.on("refresh", function(gameState) {
	var myTanksNewPosition = gameState.tanks.filter(function(t) {
		return selectedPlayer.playerColor === t.color;
	});
	updateMyTanks(myTanksNewPosition);
	enemyFlags = gameState.flags.filter(function (t) {
	    return selectedPlayer.playerColor !== t.color;
	});
	allTanks = gameState.tanks;
	enemyTanks = gameState.tanks.filter(function (t) {
	    //console.log(selectedPlayer.playerColor, t);
	    return selectedPlayer.playerColor !== t.color;
	});
	//console.log(enemyTanks);
	allObstacles = gameState.boundaries;

	for (var i = 0; i < myTanks.length; i++)
	{
	    if (myTanks[i].hasFlag) {
	        myTanks[i].goHome();
	    } else {
	        myTanks[i].attack();
	    }
        
	}
    //calculateGoal();
    // if (gameState.boundaries.length > 0) {
	// 	//calculateObstacle(gameState.boundaries);
	// }
	
});

function updateMyTanks (myTanksNewPosition) {
    for (var i = 0; i < myTanks.length; i++) {
        myTanks[i].hasFlag = false;
		for (var j = 0; j < myTanksNewPosition.length; j++) {
		    if (myTanks[i].tankNumber === myTanksNewPosition[j].tankNumber) {
				myTanks[i].position = myTanksNewPosition[j].position;
				myTanks[i].angle = myTanksNewPosition[j].angle;
				myTanks[i].hasFlag = myTanksNewPosition[j].hasFlag;
			}
		}
	}
}

function calculateGoal() {
	var distance = 0;
	var angle = 0;
	var degrees = 0;
	var relativeX = 0;
	var relativeY = 0;
	var angleDifference = 0;

	for (var i = 0; i < myTanks.length; i++) {
		if (myTanks[i].hasTarget()) {
			goal = myTanks[i].getTarget();
		} else {
			goal = myTanks[i].generateTarget();
		}
		//find distance to goal
		distance = round(Math.sqrt(Math.pow(( goal.x - myTanks[i].position.x ), 2) + Math.pow(( goal.y - myTanks[i].position.y ), 2)), 4);

		//find angle difference to face goal
		relativeX = goal.x - myTanks[i].position.x;
		relativeY = goal.y - myTanks[i].position.y;
		angle = round(Math.atan2(-(relativeY), relativeX), 4);
		degrees = round(angle * (180 / Math.PI), 4);  //convert from radians to degrees
		degrees = -(degrees); // tank degrees ascends clockwise. atan2 ascends counter clockwise. this fixes that difference

		//turn in the direction whichever is closer
		if (degrees < 0) {
			degrees = (degrees + 360) % 360;
		}

		angleDifference = myTanks[i].angle - degrees;

		if (angleDifference > 0) {
			if (angleDifference < 180) {
				myTanks[i].goal.angleVel = -1;
			} else {
				myTanks[i].goal.angleVel = 1;
			}
		} else {
			if (angleDifference > -180) {
				myTanks[i].goal.angleVel = 1;
			} else {
				myTanks[i].goal.angleVel = -1;
			}
		}

		//set speed
		if (distance >= 10) {
			myTanks[i].goal.speed = 1;
		} else {
			//myTanks[i].goal.speed = 0;
			myTanks[i].missionAccomplished();
		}
	}
}

//function calculateObstacle(obstacles) {
//    var distance, relativeX, relativeY, angle, degrees, obstacleRadius, howClose, buf

//    for (var i=0, maxi = myTanks.length; )
//}





/*** TANK ***/
var Tank = function(tankNumber) {
	this.tankNumber = tankNumber;
	this.tankColor = selectedPlayer.playerColor;
	this.position = {x: 0, y: 0};
	this.angle;
	this.goal = {
		speed: 0,
		angleVel: 0
	};
	this.avoidObstacle = {
		speed: 0,
		angleVel: 0
	};
	this.avoidTank = {
	    speed: 0,
        angleVel: 0
	}
	this.target = {
	    type: "",
	    color: "",
	    number: "",
	    position: {
	        x: 100,
            y: 100
	    }
	}
	this.hasATarget = false;
	this.tanksToIgnore = [];
	this.firing = false;
	this.hasFlag = false;
};

var CONSTANTS = {
    AVOID_OBSTACLE_STRENGTH : 1.15,
    AVOID_TANK_STRENGTH : 1.13,
    CALCULATE_ROUTE_STRENGTH : 1
}

Tank.prototype = {
    getSpeed: function () {
        return this.goal.speed + this.avoidObstacle.speed + this.avoidTank.speed;
    },
    getAngelVel: function () {
        //console.log(this.goal.speed, this.avoidObstacle.speed, this.avoidTank.speed);
        return this.goal.angleVel + this.avoidObstacle.angleVel + this.avoidTank.angleVel;
    },
    goHome: function() {
        this.target = myBase.position;
        this.hasATarget = true;

        //if (this.position.x === myBase.position.x && this.position.y === myBase.position.y) {
        //    this.hasFlag = false;
        //}

        var closestTank = { tank: null, distance: Infinity }, distance;
        //console.log(enemyTanks);
        for (var i = 0; i < enemyTanks.length; i += 1) {
            if (enemyTanks[i].dead) { continue; }
            distance = round(Math.sqrt(Math.pow((enemyTanks[i].position.x - this.position.x), 2) + Math.pow((enemyTanks[i].position.y - this.position.y), 2)), 4);
            if (distance < 50 && distance < closestTank.distance) {
                closestTank.tank = enemyTanks[i];
                closestTank.distance = distance;
            }
        }
        if (closestTank.tank) {
            //console.log(priorityTarget);
            if (!this.firing) {
                setTimeout(function () {
                    command.emit("fire", { tankNumbers: [this.tankNumber] });
                    this.firing = false;
                }, 750);
            }
        }
        this.calculateRoute();
        this.calculateObstacle();
        this.calculateTanks();
        //this.avoidOtherTanks("enemy");
    },
	getTarget: function() {
		return this.target;
	},
	hasTarget: function() {
		return this.hasATarget;
	},
	generateTarget: function() {
	    this.target.type = "flag";
	    var eFlag = Math.floor(Math.random() * (enemyFlags.length - 1));
	    //console.log(eFlag);
	    this.target = enemyFlags[eFlag].position;
	    this.hasATarget = true;
		return this.target;
	},
	missionAccomplished: function() {
		this.hasATarget = false;
	},
	returnHome: function () {
	    this.target = myBase.position;
	},
	wander: function () {
	    var randomNumber = Math.floor(Math.random() * 10 % allBases.length);
	    this.target = allBases[randomNumber].base.position;
	},
	attack: function () {
	    var self = this;
	    var priorityTarget;
	    if (!this.target.type !== "flag") {
	        this.generateTarget();
	    } else {
	        this.updateTarget();
	    }

	    if (this.hasFlag)
	    {
	        this.goHome();
	    }
	    var closestTank = { tank: null, distance: Infinity }, distance;
	    //console.log(enemyTanks);
	    for (var i = 0; i < enemyTanks.length; i += 1) {
	        if (enemyTanks[i].dead) { continue; }
	        distance = round(Math.sqrt(Math.pow((enemyTanks[i].position.x - this.position.x), 2) + Math.pow((enemyTanks[i].position.y - this.position.y), 2)), 4);
	        if (distance < 100 && distance < closestTank.distance) {
	            closestTank.tank = enemyTanks[i];
	            closestTank.distance = distance;
	        }
	    }
	    if (closestTank.tank) {
	        priorityTarget = closestTank.tank.position;
	        //console.log(priorityTarget);
	        if (!this.firing) {
	            setTimeout(function() {
	                command.emit("fire", {tankNumbers: [self.tankNumber]});
	                self.firing = false;
	            }, 750);
	        }
	    } else {
	        priorityTarget = this.target.position;
	    }

	    this.calculateRoute(priorityTarget);
	    this.calculateObstacle();
	    //this.calculateTanks();
	},
	calculateRoute: function(priorityTarget) {
	    if (!this.hasTarget) {
	        this.GenerateTarget();
	    }
	    if (!priorityTarget) {
	        priorityTarget = this.target;
	    }
	    var relativeX = priorityTarget.x - this.position.x;
	    var relativeY = priorityTarget.y - this.position.y;

	    distance = round(Math.sqrt(Math.pow((relativeX), 2) + Math.pow((relativeY), 2)), 4);

	    angle = round(Math.atan2(-(relativeY), relativeX), 4);
	    degrees = round(angle * (180/Math.PI), 4);
	    degrees = -(degrees);

	    if (degrees < 0) {
	        degrees = (degrees + 360) %360;
	    }

	    angleDifference = this.angle - degrees;

	    if (angleDifference > 0) {
	        if (angleDifference < 180) {
	            this.goal.angleVel = -CONSTANTS.CALCULATE_ROUTE_STRENGTH;//-1.5;
	        } else {
	            this.goal.angleVel = CONSTANTS.CALCULATE_ROUTE_STRENGTH;
	        }
	    } else {
	        if (angleDifference > -180) {
	            this.goal.angleVel = CONSTANTS.CALCULATE_ROUTE_STRENGTH;;
	        } else {
	            this.goal.angleVel = -CONSTANTS.CALCULATE_ROUTE_STRENGTH;;
	        }
	    }
	    if (distance >= 10) {
	        this.goal.speed = 1;
	    }
	},
	calculateObstacle: function () {
	    var distance, relativeX, relativeY, angle, degrees, obstacleRadius, howClose, bufferZone = 15, angleDifference;

	    this.avoidObstacle.angleVel = 0;
	    this.avoidObstacle.speed = 0;

	    for(var j = 0, maxj = allObstacles.length; j < maxj; j++)
	    {
	        distance = round(Math.sqrt(Math.pow(allObstacles[j].position.x - this.position.x, 2) + Math.pow(allObstacles[j].position.y - this.position.y, 2)),4)

	        obstacleRadius = round(Math.sqrt(Math.pow(allObstacles[j].size.height, 2) + Math.pow(allObstacles[j].size.width, 2)), 4);

	        if (distance < (obstacleRadius + bufferZone)) {
	            var angleToObstacle = round(Math.atan2(-(allObstacles[j].position.y - this.position.y), -(allObstacles[j].position.x - this.position.x)), 4);
	            angleToObstacle = round(angleToObstacle * (180/Math.PI), 4);

	            if (angleToObstacle < 0) {
	                angleToObstacle = (angleToObstacle + 360) % 360;
	            }

	            angleDifference = this.angle - angleToObstacle;

	            if (angleDifference > 0) {
	                if (angleDifference < 180) {
	                    this.avoidObstacle.angleVel = (round(-CONSTANTS.AVOID_OBSTACLE_STRENGTH * (obstacleRadius + bufferZone)/distance, 4));
	                } else {
	                    this.avoidObstacle.angleVel = (round(CONSTANTS.AVOID_OBSTACLE_STRENGTH * (obstacleRadius + bufferZone) / distance, 4));
	                }
	            } else {
	                if (angleDifference > -180) {
	                    this.avoidObstacle.angleVel = (round(CONSTANTS.AVOID_OBSTACLE_STRENGTH * (obstacleRadius + bufferZone) / distance, 4));
	                } else {
	                    this.avoidObstacle.angleVel = (round(-CONSTANTS.AVOID_OBSTACLE_STRENGTH * (obstacleRadius + bufferZone) / distance, 4));
	                }
	            }
	            this.avoidObstacle.speed = 1;
	        }
	    }
	},
	calculateTanks: function () {
	    var distance, relativeX, relativeY, angle, degrees, tankRadius, howClose, bufferZone = 10, angleDifference;

	    this.avoidTank.angleVel = 0;
	    this.avoidTank.speed = 0;

	    for (var j = 0, maxj = allTanks.length; j < maxj; j++) {
	        if (allTanks[j].tankNumber === this.tankNumber) { continue;}
	        distance = round(Math.sqrt(Math.pow(allTanks[j].position.x - this.position.x, 2) + Math.pow(allTanks[j].position.y - this.position.y, 2)), 4)

	        tankRadius = round(Math.sqrt(Math.pow(allTanks[j].size.height, 2) + Math.pow(allTanks[j].size.width, 2)), 4);

	        if (distance < (tankRadius + bufferZone)) {
	            var angleToTank = round(Math.atan2(-(allTanks[j].position.y - this.position.y), -(allTanks[j].position.x - this.position.x)), 4);
	            angleToTank = round(angleToTank * (180 / Math.PI), 4);

	            if (angleToTank < 0) {
	                angleToTank = (angleToTank + 360) % 360;
	            }

	            angleDifference = this.angle - angleToTank;

	            if (angleDifference > 0) {
	                if (angleDifference < 180) {
	                    this.avoidTank.angleVel = (round(-CONSTANTS.AVOID_TANK_STRENGTH * (tankRadius + bufferZone) / distance, 4));
	                } else {
	                    this.avoidTank.angleVel = (round(CONSTANTS.AVOID_TANK_STRENGTH * (tankRadius + bufferZone) / distance, 4));
	                }
	            } else {
	                if (angleDifference > -180) {
	                    this.avoidTank.angleVel = (round(CONSTANTS.AVOID_TANK_STRENGTH * (tankRadius + bufferZone) / distance, 4));
	                } else {
	                    this.avoidTank.angleVel = (round(-CONSTANTS.AVOID_TANK_STRENGTH * (tankRadius + bufferZone) / distance, 4));
	                }
	            }
	            //console.log(this.avoidTank.angleVel, this.avoidTank.speed);
	            this.avoidTank.speed = 1;
	        }
	    }
	}
};


//rounds number (value) to specified number of decimals
function round(value, decimals) {
    return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}


