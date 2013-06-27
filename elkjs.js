// main block for ElkJs
// written by Darren Coles

function ElkJs(output) {
	var frameSpeeds = new Array();

	var d = new Date();
	var startTime = d.getTime();
	var lastFrame = startTime;
	var frameCount = 0;

	var running = true;
	
	var soundEnabled = true;
	
	var requestAnimationFrame = (
		//window.requestAnimationFrame || window.msRequestAnimationFrame ||
		//window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame ||
		//window.oRequestAnimationFrame ||
		function(callback) {
			setTimeout(function() {
				callback();
			}, 20);
		}
	);

	var self = {};

	var firstFrame = true;

	var sheila = ElkJs.Sheila({
	});

	var keyboard = ElkJs.Keyboard({
	});

	var memory = ElkJs.Memory({
		sheila: sheila,
		keyboard: keyboard	
	});


	var display = ElkJs.Display({
		sheila: sheila,
		memory : memory,
		output: output
	});

	var processor = ElkJs.Processor({
		memory : memory,
		sheila : sheila,
		display: display
	});


	var uefHandler = ElkJs.UEFFile({
		processor: processor,
		sheila: sheila,
		memory : memory
	});
	
	var sound = ElkJs.Sound({
		sheila: sheila
	});

	var tape = ElkJs.Tape({
		uef: uefHandler,
		processor: processor,
		sheila: sheila
	});

	
	setTimeout(runframe, 20);
	//requestAnimationFrame(runframe);

	function runframe() {
		if (running & memory.loaded==2) {
			if (firstFrame) {
				self.reset();
				firstFrame = false;
			}
			var d2 = new Date();
			var currTime = d2.getTime();
			var reqFrames = (currTime - startTime)/20;
			//while (frameCount< reqFrames)
			{
				display.startFrame();
				sound.startFrame();
				while (display.beamRow<312) {
					display.startRow();
					processor.runCode();
					display.processRow();
					sound.processRow();
					tape.process();
					if (display.beamRow==99) {
						sheila.trigger_rtc();
					}
					if (display.beamRow==255) {
						sheila.trigger_vbl();
					}
				}
				sound.endFrame(soundEnabled);
				frameCount++;
			}
		}
		d2 = new Date();
		frameSpeeds.push(d2.getTime()-currTime);
		if (frameSpeeds.length>1000) frameSpeeds.pop();
		var nextframe = Math.max(1,20-(d2.getTime()-currTime));
		//console.info(nextframe);
		setTimeout(runframe, nextframe );
		//requestAnimationFrame(runframe);
	}

    function autoLoad() {
        self.reset();
        keyboard.autoLoad();    
    }

	self.reset = function () {
	    //memory.reset();
	    //sheila.reset();
	    display.reset();
	    processor.reset6502();
	};
	
	self.hardReset = function () {
	    memory.reset();
	    sheila.reset();
	    display.reset();
	    processor.reset6502();
	};

	self.pauseResume = function() {
		running = !running;
		return running;
	}
	
	self.soundToggle = function() {
		soundEnabled = !soundEnabled;
		return soundEnabled;
	}
	
	self.openFile = function(file) {
		 uefHandler.loadUEF(file,autoLoad);
	}
	
	self.setLoadSpeed = function(speed) {
		uefHandler.setLoadSpeed(speed);
	}

	self.setAutoLoad = function(auto) {
		uefHandler.setAutoLoad(auto);
	}

	self.refreshTapeDialog = function(tapeDialogName) {
		$("#"+tapeDialogName+" span").text(uefHandler.filename);
		uefHandler.populateTapeDataTable(tapeDialogName+" table");
	}
	
	self.tapeFwd = function() {
		uefHandler.tapeFwd();
	}
	
	self.tapeRew = function() {
		uefHandler.tapeRew();
	}

	self.tapeFirst = function() {
		uefHandler.tapeFirst();
	}
	
	self.tapeLast = function() {
		uefHandler.tapeLast();
	}

	self.tapeEject = function() {
		uefHandler.tapeEject();
	}

	return self;
}