// main initialisation routines for ElkJs
// written by Darren Coles

var elkjs = null;			

function reset() {
	elkjs.reset();
}

function pauseResume() {
	var running = elkjs.pauseResume();
	if (running) {
		$("#btnPause span").text("Pause");
	}
	else {
		$("#btnPause span").text("Resume");
	}
}

function openFile() {
	elkjs.openFile( $("#snapshotselect").val());
}

function changeLoadSpeed() {
	elkjs.setLoadSpeed($("#loadSpeed").val());
}

function fileSelected(evt) {
	var files = evt.target.files;
	if (files.length>0) {
		elkjs.openFile(files[0]);
	}
	
}

function changeAutoLoad() {
	elkjs.setAutoLoad($('#autoLoad').is(':checked'));
}

function soundToggle() {
	var sound = elkjs.soundToggle();
	if (sound) {
		$("#btnSound span").text("Sound off");
	}
	else {
		$("#btnSound span").text("Sound on");
	}
}