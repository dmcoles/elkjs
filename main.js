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
		$("#btnSound span").text("Turn sound off");
	}
	else {
		$("#btnSound span").text("Turn sound on");
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

function fullScreen() {
    if ($('#accordion').is(':hidden')) {
        $("#accordion").show();
        $("#ElkJsOutput").height(512);
        $("#elkjs").css("left", 420);
        $("#btnFullscreen span").text("Expand");
    }
    else {
        $("#accordion").hide();
        $("#ElkJsOutput").height(window.innerHeight - 80);
        $("#elkjs").css("left", 20);
        $("#btnFullscreen span").text("Shrink");
    }
}
function saveSnapshot() {
    var bytes = elkjs.saveSnapshot();

    var binary = '';
    var len = bytes.length;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    filedata = 'data:application/octet-stream;base64,'
          + encodeURIComponent(window.btoa(binary));

    var pom = document.createElement('a');
    pom.setAttribute('href', filedata);
    pom.setAttribute('download', 'snapshot.uef');

    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    }
    else {
        pom.click();
    }
}