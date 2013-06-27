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
	elkjs.openFile( $("#gameSelect").val());
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

function toggleDialog() {

	$("#tapeDialog").load("tapedialog.html").dialog({
				autoOpen: false,
				width: 600,
				height: 400,
				buttons: [
					{
						text: "Ok",
						click: function() {
							$( this ).dialog( "close" );
						}
					}
				]
				}
				);
	
	if ($("#tapeDialog").dialog("isOpen")) {
	    $("#tapeDialog").dialog("close");
	}
	else {
	    $("#tapeDialog").dialog("open");
    elkjs.refreshTapeDialog("tapeDiv");
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
}
