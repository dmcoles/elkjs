// memory emulation routines for ElkJs
// written by Darren Coles

ElkJs.Memory = function (opts) {
    var self = {};

    var ramsize = 32768;
    var ram = new Uint8Array(ramsize);
    var roms = new Array();

    var sheila = opts.sheila;
    var keyboard = opts.keyboard;

    var processor = null;

    self.loaded = 0;

    function waitforramsync() {
        processor.waitforramsync();
    }

    function load_binary_resource(url, name) {

        var oReq = new XMLHttpRequest();
        oReq.open("GET", url, true);
        oReq.responseType = "arraybuffer";

        oReq.onload = function (oEvent) {
            var arrayBuffer = oReq.response; // Note: not oReq.responseText
            if (arrayBuffer) {
                roms[name] = new Uint8Array(arrayBuffer);
                self.loaded++;
            }
        };

        oReq.send(null);
    }


    /*function load_binary_resource(url,name) {
    var reader = new FileReader();
	
    reader.onload = function(event) {
    roms[name] = new Uint8Array(event.target.result);
    };
		
    reader.readAsArrayBuffer(url);
		
    }*/

    load_binary_resource('./os.rom', 'os');
    load_binary_resource('./basic.rom', 'basic');

    self.readmem = function (addr, direct) {
        if (addr < 0x8000) {
            if (!direct) waitforramsync();
            return ram[addr];
        }
        if (addr < 0xC000) {
            var rombank = sheila.romBank;
            switch (rombank) {
                case 8:
                case 9:
                    return keyboard.readkeys(addr);
                case 10:
                case 11:
                    return roms["basic"][addr & 0x3FFF];
                default:
                    return roms["basic"][addr & 0x3FFF];
                    //return addr>>8;
            }



            /*if (!sheila.extRom)
            {
            if (sheila.intRomBank&2) return roms["rom10"][addr&0x3FFF];
            return keyboard.readkeys(addr);
            //return roms["rom09"][addr&0x3FFF];
            }
            var rombank = sheila.romBank;
				
            if (rombank==0x0) return roms["rom12"][addr&0x3FFF];
            if (rombank==0x1) return  roms["rom13"][addr&0x3FFF];
                
            //return roms["rom10"][addr&0x3FFF];
            return addr>>8;*/
        }

        if ((addr & 0xFF00) == 0xFE00) {
            var sheila_reg = sheila.read(addr);
            if (sheila_reg != undefined) return sheila_reg;
        }

        return roms["os"][addr & 0x3FFF];
    }

    self.readmem16 = function (addr) {
        return self.readmem(addr) + (self.readmem(addr + 1) << 8);
    }

    self.writemem = function (addr, val) {
        val = val & 0xff;
        if (addr < 0x8000) {
            waitforramsync();
            ram[addr] = val;
        }
        else if ((addr & 0xFF00) == 0xFE00) {
            sheila.write(addr, val);
        }

    }

    self.loadSnapshot = function (buffer, offset, datalen) {
        //ignore anything that isnt a ram snapshot
        if (buffer[offset + 0] != 0) return;

        for (var i = 0; i < datalen - 1; i++) {
            ram[i] = buffer[offset + i + 1];
        }

    }

    self.makeSnapshotData = function () {
        var bytes = new Array();
        bytes.push(0); //update byte
        bytes.push(0); //memory source (from ram at address 0)
        for (var i = 0; i < ramsize; i++) {
            bytes.push(ram[i]);
        }
        return bytes;
    }

    self.reset = function () {
        for (var i = 0; i < ramsize; i++) ram[i] = 0;
    }

    self.setProcessor = function (p) {
        processor = p;
    }

    return self;
}