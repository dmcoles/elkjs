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

function changeLoadSpeed() {
	elkjs.setLoadSpeed($("#loadSpeed").val());
}

function fileSelected(evt) {
	var files = evt.target.files;
	if (files.length>0) {
		$("#btnTape").removeAttr('disabled');
		elkjs.openFile(files[0]);
	}
	
}

function changeAutoLoad() {
	elkjs.setAutoLoad($('#autoLoad').prop('checked'));
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

function toggleTapeDialog() {
	
	if ($("#tapeDialogMain").dialog("isOpen")) {
	    $("#tapeDialogMain").dialog("close");
	}
	else {
	    $("#tapeDialogMain").dialog("open");
    elkjs.refreshTapeDialog("tapeDialogMain");
	}

}

function toggleGamesDialog() {
	if ($("#gamesDialogMain").dialog("isOpen")) {
	    $("#gamesDialogMain").dialog("close");
	}
	else {
	    $("#gamesDialogMain").dialog("open");
	}

}

function tapeFwd() {
	elkjs.tapeFwd();
}

function tapeRew() {
	elkjs.tapeRew();
}

function tapeFirst() {
	elkjs.tapeFirst();
}

function tapeLast() {
	elkjs.tapeLast();
}

function tapeEject() {
	elkjs.tapeEject();
	$("#btnTape").attr('disabled','disabled');
}
