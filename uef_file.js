// uef file handling emulation routines for ElkJs
// written by Darren Coles

ElkJs.UEFFile = function (opts) {
    var self = {};

	var tableName = "";
	
    var snapshotLoaded = false;

    var tapeLoaded = false;

    var tapeData = new Array();

    var tapePos = 0;

    var currentTime = 0;

    var dataOffset = 0;
    var dataBit = -1;

    var processor = opts.processor;
    var memory = opts.memory;
    var sheila = opts.sheila;

    var highTone = false;

    var autoLoad = true;

    var fastLoad = true;

	self.filename = "";
	
    function load_filereader(file, callback, callback2) {
        var reader = new FileReader();
        reader.onload = function (e) {
            callback(e.target.result,callback2);
        };

        reader.readAsArrayBuffer(file);
    }

    function load_binary_resource(url, callback,callback2) {

        var oReq = new XMLHttpRequest();
        oReq.open("GET", url, true);
        oReq.responseType = "arraybuffer";


        oReq.onload = function (oEvent) {
            var arrayBuffer = oReq.response; // Note: not oReq.responseText
            if (arrayBuffer) {
                callback(arrayBuffer,callback2);
            }
        };

        oReq.send(null);
    }

    function processUEF(arrayBuffer, autoLoadcallback) {

        tapeData = new Array();
        tapePos = 0;

        var buffer = null;

        buffer = new Uint8Array(arrayBuffer);
        var unzipper = new JSUnzip(buffer);

        if (unzipper.isZipFile()) {
            unzipper.readEntries();

            for (var i = 0; i < unzipper.entries.length; i++) {
                var entry = unzipper.entries[i];
                var fname = entry.fileName.toUpperCase();
                if (fname.length > 4 & fname.substr(entry.fileName.length - 4) == '.UEF' & (entry.compressionMethod == 8 | entry.compressionMethod == 0)) {

                    if (entry.compressionMethod == 8) {
                        var deflated = JSInflate.inflate(entry.data);
                        buffer = new Uint8Array(deflated);
                    } else {
                        buffer = Uint8Array(entry.data);
                    }
                    break;
                }

            }
        }



        if (buffer[0] == 0x1f & buffer[1] == 0x8b & buffer[2] == 0x08) {

            var deflated = JSInflate.inflate(buffer);
            buffer = new Uint8Array(deflated);
        }

        snapshotLoaded = false;
        tapeLoaded = false;

        if ((String.fromCharCode(buffer[0]) != 'U') | (String.fromCharCode(buffer[1]) != 'E') | (String.fromCharCode(buffer[2]) != 'F') |
		(String.fromCharCode(buffer[3]) != ' ') | (String.fromCharCode(buffer[4]) != 'F') | (String.fromCharCode(buffer[5]) != 'i') |
		(String.fromCharCode(buffer[6]) != 'l') | (String.fromCharCode(buffer[7]) != 'e') | (String.fromCharCode(buffer[8]) != '!') |
		(buffer[9] != 0)) {
            return;
        }

        var offset = 12;
        var chunktype = 0;
        var chunklen = 0;
        while (offset < buffer.length) {
            chunktype = (buffer[offset]) + (buffer[offset + 1] << 8);
            chunklen = (buffer[offset + 2]) + (buffer[offset + 3] << 8) + (buffer[offset + 4] << 16) + (buffer[offset + 5] << 24);
            offset += 6;
            switch (chunktype) {
                //snapshot chunks 
                case 0x0400: //6502 state
                    // update,a, p (status), x, y, s, pc
                    processor.loadSnapshot(buffer, offset + 1);
                    snapshotLoaded = true;
                    break;
                case 0x0401: //ula chunk type
                    sheila.loadSnapshot(buffer, offset + 1);
                    snapshotLoaded = true;
                    break
                case 0x0410: //memory chunk type
                    memory.loadSnapshot(buffer, offset + 1, chunklen - 1);
                    snapshotLoaded = true;
                    break;

                //tape data chunks 
                case 0x100:
                    tapeLoaded = true;
                    var data = new Array();
                    for (i = 0; i < chunklen; i++) { data.push(buffer[offset + i]); }
                    tapeData.push({
                        type: "implicitDataBlock",
						desc: "data block",
                        data: data
                    });
                    break;

                case 0x101:
                    tapeData.push({
						desc: "multiplexed data block"
                    });
                    break;

                case 0x102:
                    tapeData.push({
						desc: "explicit tape data block"
                    });
                    break;

                case 0x104:
                    tapeData.push({
						desc: "defined tape format data block"
                    });
                    break;

                case 0x110:
                    cycleCount = buffer[offset] + (buffer[offset + 1] << 8)

                    tapeData.push({
                        type: "carrier",
						desc: "carrier",
                        cycleCount: cycleCount
                    });

                    break;

                case 0x111:
                    tapeLoaded = true;
                    cycleCount1 = buffer[offset] + (buffer[offset + 1] << 8)
                    cycleCount2 = buffer[offset + 2] + (buffer[offset + 3] << 8)

                    tapeData.push({
                        type: "carrierWithDummy",
						desc: "carrier with dummy byte",
                        preCycleCount: cycleCount1,
                        postCycleCount: cycleCount2
                    });

                    break;

                case 0x112:
                    tapeLoaded = true;
                    gap = buffer[offset] + (buffer[offset + 1] << 8)

                    tapeData.push({
                        type: "integerGap",
						desc: "integer tap",
                        gapTime: gap
                    });
                    break;

                case 0x116:
                    tapeData.push({
                        desc: "floating point gap"
                    });
					
                    break;

                case 0x113:
                    tapeData.push({
                        desc: "change of base frequency"
                    });
                    break;

                case 0x114:
                    tapeData.push({
                        desc: "security cycles"
                    });
                    break;

                case 0x115:
                    tapeData.push({
                        desc: "phase change"
                    });
                    break;

                case 0x117:
                    tapeData.push({
                        desc: "data encoding format change"
                    });
                    break;

                case 0x120:
                    tapeData.push({
                        desc: "position marker"
                    });
                    break;

                case 0x130:
                    tapeData.push({
                        desc: "tape set info"
                    });
                    break;

                case 0x131:
                    tapeData.push({
                        desc: "start of tape side"
                    });
                    break;

            }
            offset += chunklen;


        }

        if (tapeLoaded & autoLoad) {
            autoLoadcallback();
        }

    }

    self.loadUEF = function (file,autoLoadCallback) {
        if (Object.prototype.toString.call(file) == '[object File]') {
			self.filename = file.filename;
            load_filereader(file, processUEF, autoLoadCallback);
        }
        else {
            load_binary_resource(file, processUEF, autoLoadCallback)
			self.filename=file;
        }
    }

    self.snapshotLoaded = function () {
        return snapshotLoaded;
    }

    self.tapeLoaded = function () {
        return tapeLoaded;
    }

    self.process = function () {
        var processNext = false;


        if (!tapeData.length) return;

        switch (tapeData[tapePos].type) {
            case "carrier":
                if (!highTone) {
                    sheila.trigger_hightone();
                    highTone = true;
                }
                currentTime++;
                if (currentTime >= tapeData[tapePos].cycleCount * 13 / (fastLoad ? 4 : 1)) processNext = true;
                break;

            case "implicitDataBlock":
                highTone = false;
                currentTime++;
                if (fastLoad & sheila.casetteDataRead & currentTime < 11) currentTime = 11;
                if (currentTime >= 13) {

                    currentTime = 0;
                    if ((dataBit++) == 8) {
                        dataBit = 0;
                        sheila.clear_receive();
                        if (++dataOffset >= tapeData[tapePos].data.length) {
                            processNext = true;
                        }
                        else {
                            //sheila.addTapeBit(tapeData[tapePos].data[dataOffset] & (1 << dataBit));				
                        }
                    }
                    else {
                        //sheila.addTapeBit(tapeData[tapePos].data[dataOffset] & (1 << dataBit));
                        if (dataBit == 7) {
                            sheila.setTapeData(tapeData[tapePos].data[dataOffset]);
                            sheila.casetteDataRead = false;
                            sheila.trigger_receive();
                        }
                    }


                }
                break;

            case "integerGap":
                currentTime++;
                if (currentTime >= tapeData[tapePos].gapTime * 13) {
                    processNext = true;
                }
                break;

            default:
                processNext = true;
        }

        if (processNext) {
			if (tableName!="") self.populateTapeDataTable(tableName);
            if (++tapePos > tapeData.length) {
                tapePos = 0;
            }
            currentTime = 0;
            dataOffset = 0;
            dataBit = -1;
        }

    }

    self.stopTape = function () {
        highTone = false;
        currentTime = 0;
        dataOffset = 0;
        dataBit = -1;
    }

    self.startTape = function () {
    }

    self.setAutoLoad = function (auto) {
        autoLoad = auto;
    }

    self.setLoadSpeed = function (speed) {
        fastLoad = speed > 1;
    }

	self.populateTapeDataTable = function(tablename) {
		tableName = tablename;
		$("#"+tablename+" tr").remove();
		$("#"+tablename).append('<tr style="height: 20px;background-color: blue"><th> Chunk</th><th> Description</th></tr>');
		if (!tapeData) return;
		
		for (var i = 0; i<tapeData.length; i++) {
			if (i==tapePos) {
				$("#"+tablename).append('<tr style="height: 20px;background-color: white"><td>'+i.toString()+'</td><td>'+tapeData[i].desc+'</td></tr>');
			}
			else {
				$("#"+tablename).append('<tr style="height: 20px;background-color: gray"><td>'+i.toString()+'</td><td>'+tapeData[i].desc+'</td></tr>');
			}
		}
	}
	
	self.tapeFwd = function() {
		if (!tapeData) return;
		if (tapePos<tapeData.length-1) tapePos++;
        highTone = false;
        currentTime = 0;
        dataOffset = 0;
        dataBit = -1;
		if (tableName!="") self.populateTapeDataTable(tableName);
	}
	
	self.tapeRew = function() {
		if (!tapeData) return;
		if (tapePos>0) tapePos--;
        highTone = false;
        currentTime = 0;
        dataOffset = 0;
        dataBit = -1;
		if (tableName!="") self.populateTapeDataTable(tableName);
	}

	self.tapeFirst = function() {
		if (!tapeData) return;
		tapePos = 0;
        highTone = false;
        currentTime = 0;
        dataOffset = 0;
        dataBit = -1;
		if (tableName!="") self.populateTapeDataTable(tableName);
	}
	
	self.tapeLast = function() {
		if (!tapeData) return;
		tapePos = tapeData.length-1;
        highTone = false;
        currentTime = 0;
        dataOffset = 0;
        dataBit = -1;
		if (tableName!="") self.populateTapeDataTable(tableName);
	}

	self.tapeEject = function() {
		if (!tapeData) return;
		tapeLoaded = false;
		tapeData = new Array();
		tapePos = 0;
		if (tableName!="") self.populateTapeDataTable(tableName);
	}
	
    return self;
}