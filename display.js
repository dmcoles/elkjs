// display emulation routines for ElkJs
// display emulation routines for ElkJs
// written by Darren Coles

ElkJs.Display = function (opts) {
    var self = {};

    var sheila = opts.sheila;
    var memory = opts.memory;
    var output = opts.output;

    var element = document.getElementById(output);
    var context = element.getContext("2d");



    var imageData = null;
    var buf = null;

    var buf8 = null;
    var data = null;

    var screenStart = 0;
    var screenRowStart = 0;

    var rowCount = 0;

    self.beamRow = 0;
    self.displayOn = true;

    var pixelIndex = 0;

    self.reset = function () {
    }

    /*var colours = {
    0: {r: 0, g: 0, b: 0},
    1: {r: 255, g: 0, b: 0},
    2: {r: 0, g: 255, b: 0},
    3: {r: 255, g: 255, b: 0},
    4: {r: 0, g: 0, b: 255},
    5: {r: 255, g: 0, b: 255},
    6: {r: 0, g: 255, b: 255},
    7: {r: 255, g: 255, b: 255},
    };*/

    var colours = new Array(0xff000000, 0xff0000ff, 0xff00ff00, 0xff00ffff,
				   0xffff0000, 0xffff00ff, 0xffffff00, 0xffffffff);

    var widths = { 0: 0x280, 1: 0x280, 2: 0x280, 3: 0x280, 4: 0x140, 5: 0x140, 6: 0x140 };

    function optimisedScreenDraw() {

        var scrnAddr;

        var colour;
        var m;

        var x = 0;
        var y = self.beamRow;


        switch (sheila.screenMode) {
            case 0:
                for (x = 0; x < 640; x += 8) {
                    scrnAddr = screenRowStart + (x & 0xfff8);
                    if (scrnAddr > 32767) scrnAddr = scrnAddr - 0x5000;
                    m = memory.readmem(scrnAddr, true);

                    colour = colours[sheila.palette[(m & 128) >> 7]];
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 64) >> 6]];
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 32) >> 5]];
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 16) >> 4]];
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 8) >> 3]];
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 4) >> 2]];
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 2) >> 1]];
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 1)]];
                    data[pixelIndex++] = colour;
                }
                break;
            case 1:
                for (x = 0; x < 320; x += 4) {
                    scrnAddr = screenRowStart + ((x & 0xfffc) << 1);
                    if (scrnAddr > 32767) scrnAddr = scrnAddr - 0x5000;
                    m = memory.readmem(scrnAddr, true);

                    colour = colours[sheila.palette[((m & 128) >> 6) | ((m & 8) >> 3)]];
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[((m & 64) >> 5) | ((m & 4) >> 2)]];
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[((m & 32) >> 4) | ((m & 2) >> 1)]];
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[((m & 16) >> 3) | ((m & 1))]];
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                }
                break;
            case 2:
                for (x = 0; x < 160; x += 2) {
                    scrnAddr = screenRowStart + ((x & 0xfffe) << 2);
                    if (scrnAddr > 32767) scrnAddr = scrnAddr - 0x5000;
                    m = memory.readmem(scrnAddr, true);

                    colour = colours[sheila.palette[((m & 128) >> 4) | ((m & 32) >> 3) | ((m & 8) >> 2) | ((m & 2) >> 1)]];
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;

                    colour = colours[sheila.palette[((m & 64) >> 3) | ((m & 16) >> 2) | ((m & 4) >> 1) | ((m & 1))]];
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                }
                break;


            case 3:
                for (x = 0; x < 640; x += 8) {
                    scrnAddr = screenRowStart + (x & 0xfff8);
                    if (scrnAddr > 32767) scrnAddr = scrnAddr - 0x5000;
                    m = memory.readmem(scrnAddr, true);

                    colour = colours[sheila.palette[(m & 128) >> 7]];
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 64) >> 6]];
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 32) >> 5]];
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 16) >> 4]];
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 8) >> 3]];
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 4) >> 2]];
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 2) >> 1]];
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 1)]];
                    data[pixelIndex++] = colour;
                }
                break;
            case 4:
                for (x = 0; x < 320; x += 8) {
                    scrnAddr = screenRowStart + (x & 0xfff8);
                    if (scrnAddr > 32767) scrnAddr = scrnAddr - 0x2800;
                    m = memory.readmem(scrnAddr, true);

                    colour = colours[sheila.palette[(m & 128) >> 7]];
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 64) >> 6]];
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 32) >> 5]];
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 16) >> 4]];
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 8) >> 3]];
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 4) >> 2]];
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 2) >> 1]];
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 1)]];
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                }
                break;
            case 5:
                for (x = 0; x < 160; x += 4) {
                    scrnAddr = screenRowStart + ((x & 0xfffc) << 1);
                    if (scrnAddr > 32767) scrnAddr = scrnAddr - 0x2800;
                    m = memory.readmem(scrnAddr, true);

                    colour = colours[sheila.palette[((m & 128) >> 6) | ((m & 8) >> 3)]];
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[((m & 64) >> 5) | ((m & 4) >> 2)]];
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[((m & 32) >> 4) | ((m & 2) >> 1)]];
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[((m & 16) >> 3) | (m & 1)]];
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                }
                break;
            case 6:
            case 7:
                for (x = 0; x < 320; x += 8) {
                    scrnAddr = screenRowStart + (x & 0xfff8);
                    if (scrnAddr > 32767) scrnAddr = scrnAddr - 0x2000;
                    m = memory.readmem(scrnAddr, true);

                    colour = colours[sheila.palette[(m & 128) >> 7]];
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 64) >> 6]];
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 32) >> 5]];
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 16) >> 4]];
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 8) >> 3]];
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 4) >> 2]];
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 2) >> 1]];
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                    colour = colours[sheila.palette[(m & 1)]];
                    data[pixelIndex++] = colour;
                    data[pixelIndex++] = colour;
                }
                break;
            default:
                break;
        }
    }

    function standardScreenDraw() {

        var scrnAddr;

        var colour;
        var m;

        var x = 0;
        var y = self.beamRow;


        switch (sheila.screenMode) {
            case 0:
                for (x = 0; x < 640; x += 8) {
                    scrnAddr = screenRowStart + (x & 0xfff8);
                    if (scrnAddr > 32767) scrnAddr = scrnAddr - 0x5000;
                    m = memory.readmem(scrnAddr, true);

                    colour = colours[sheila.palette[(m & 128) >> 7]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 64) >> 6]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 32) >> 5]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 16) >> 4]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 8) >> 3]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 4) >> 2]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 2) >> 1]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 1)]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                }
                break;
            case 1:
                for (x = 0; x < 320; x += 4) {
                    scrnAddr = screenRowStart + ((x & 0xfffc) << 1);
                    if (scrnAddr > 32767) scrnAddr = scrnAddr - 0x5000;
                    m = memory.readmem(scrnAddr, true);

                    colour = colours[sheila.palette[((m & 128) >> 6) | ((m & 8) >> 3)]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[((m & 64) >> 5) | ((m & 4) >> 2)]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[((m & 32) >> 4) | ((m & 2) >> 1)]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[((m & 16) >> 3) | ((m & 1))]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                }
                break;
            case 2:
                for (x = 0; x < 160; x += 2) {
                    scrnAddr = screenRowStart + ((x & 0xfffe) << 2);
                    if (scrnAddr > 32767) scrnAddr = scrnAddr - 0x5000;
                    m = memory.readmem(scrnAddr, true);

                    colour = colours[sheila.palette[((m & 128) >> 4) | ((m & 32) >> 3) | ((m & 8) >> 2) | ((m & 2) >> 1)]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;

                    colour = colours[sheila.palette[((m & 64) >> 3) | ((m & 16) >> 2) | ((m & 4) >> 1) | ((m & 1))]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                }
                break;


            case 3:
                for (x = 0; x < 640; x += 8) {
                    scrnAddr = screenRowStart + (x & 0xfff8);
                    if (scrnAddr > 32767) scrnAddr = scrnAddr - 0x5000;
                    m = memory.readmem(scrnAddr, true);

                    colour = colours[sheila.palette[(m & 128) >> 7]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 64) >> 6]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 32) >> 5]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 16) >> 4]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 8) >> 3]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 4) >> 2]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 2) >> 1]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 1)]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                }
                break;
            case 4:
                for (x = 0; x < 320; x += 8) {
                    scrnAddr = screenRowStart + (x & 0xfff8);
                    if (scrnAddr > 32767) scrnAddr = scrnAddr - 0x2800;
                    m = memory.readmem(scrnAddr, true);
                    
                    colour = colours[sheila.palette[(m & 128) >> 7]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 64) >> 6]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 32) >> 5]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 16) >> 4]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 8) >> 3]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 4) >> 2]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 2) >> 1]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 1)]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    
                }
                break;
            case 5:
                for (x = 0; x < 160; x += 4) {
                    scrnAddr = screenRowStart + ((x & 0xfffc) << 1);
                    if (scrnAddr > 32767) scrnAddr = scrnAddr - 0x2800;
                    m = memory.readmem(scrnAddr, true);

                    colour = colours[sheila.palette[((m & 128) >> 6) | ((m & 8) >> 3)]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[((m & 64) >> 5) | ((m & 4) >> 2)]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[((m & 32) >> 4) | ((m & 2) >> 1)]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[((m & 16) >> 3) | (m & 1)]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                }
                break;
            case 6:
            case 7:
                for (x = 0; x < 320; x += 8) {
                    scrnAddr = screenRowStart + (x & 0xfff8);
                    if (scrnAddr > 32767) scrnAddr = scrnAddr - 0x2000;
                    m = memory.readmem(scrnAddr, true);

                    colour = colours[sheila.palette[(m & 128) >> 7]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 64) >> 6]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 32) >> 5]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 16) >> 4]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 8) >> 3]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 4) >> 2]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 2) >> 1]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    colour = colours[sheila.palette[(m & 1)]];
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                    data[pixelIndex++] = colour & 0xff;
                    data[pixelIndex++] = (colour & 0xff00) >> 8;
                    data[pixelIndex++] = (colour & 0xff0000) >> 16;
                    data[pixelIndex++] = 255;
                }
                break;
            default:
                break;
        }
    }

    self.startFrame = function () {
        screenStart = sheila.getScreenAddress();

        if (imageData != null) {
            if (buf8 != null) imageData.data.set(buf8);
            context.putImageData(imageData, 0, 0); // at coords 0,0
        }

        imageData = context.createImageData(640, 512);

        if (typeof (imageData.data.set) != 'undefined') {
            buf = new ArrayBuffer(imageData.data.length);
            buf8 = new Uint8Array(buf);
            data = new Uint32Array(buf);
        }
        else {
            data = imageData.data;
        }

        self.beamRow = 0;
        screenRowStart = screenStart;
        rowCount = 0;

        pixelIndex = 0;
    }

    self.startRow = function () {
        if (self.beamRow > 255) {
            self.displayOn = false;
            return;
        }

        if (sheila.screenMode == 3 || sheila.screenMode == 6 || sheila.screenMode == 7) {

            if (self.beamRow > 250) {
                self.displayOn = false;
                return;
            }

            if (self.beamRow % 10 > 7) {
                self.displayOn = false;
                return;
            }
        }

        self.displayOn = true;


    }

    self.processRow = function () {

        if (self.beamRow >= 256) {
            self.beamRow++;
            return;
        }

        if (sheila.screenMode == 3 || sheila.screenMode == 6 || sheila.screenMode == 7) {

            if (self.beamRow >= 250) {
                self.beamRow++;
                return;
            }

            if (self.beamRow % 10 > 7) {
                self.beamRow++;
                if (buf8 != null) {
                    pixelIndex += 640;
                } else {
                    pixelIndex += 2560;
                }
                return;
            }
        }

        if (buf8 != null) {
            optimisedScreenDraw();
            pixelIndex += 640;
        }
        else {
            standardScreenDraw();
            pixelIndex += 2560;
        }



        if ((rowCount & 7) < 7) {
            screenRowStart += 1;
        }
        else {
            screenRowStart += widths[sheila.screenMode] - 7;
        }


        self.beamRow++
        rowCount++;
    }

    return self;
}