// keyboard emulation routines for ElkJs
// written by Darren Coles

ElkJs.Keyboard = function () {
    var self = {};

    self.active = true;

    var autoKeys = false;
    var autoKeyValues = new Array();

    var keyStates = new Array();

    keyStates[0] = 0; //13
    keyStates[1] = 0; //12
    keyStates[2] = 0;
    keyStates[3] = 0;
    keyStates[4] = 0;
    keyStates[5] = 0;
    keyStates[6] = 0;
    keyStates[7] = 0;
    keyStates[8] = 0;
    keyStates[9] = 0;
    keyStates[10] = 0;
    keyStates[11] = 0;
    keyStates[12] = 0;
    keyStates[13] = 0;

    var keyCodes = {
        27: { row: 13, mask: 0x01 }, /* ESC */
        49: { row: 12, mask: 0x01 }, /* 1 */
        50: { row: 11, mask: 0x01 }, /* 2 */
        51: { row: 10, mask: 0x1 }, /* 3 */
        52: { row: 9, mask: 0x1 }, /* 4 */
        53: { row: 8, mask: 0x1 }, /* 5 */
        54: { row: 7, mask: 0x1 }, /* 6 */
        55: { row: 6, mask: 0x1 }, /* 7 */
        56: { row: 5, mask: 0x1 }, /* 8 */
        57: { row: 4, mask: 0x1 }, /* 9 */
        48: { row: 3, mask: 0x1 }, /* 0 */
        173: { row: 2, mask: 0x1 }, /* - */
        37: { row: 1, mask: 0x1 }, /* left arrow */
        39: { row: 0, mask: 0x1 }, /* right arrow */

        20: { row: 13, mask: 0x2 }, /* CAPS */
        81: { row: 12, mask: 0x2 }, /* Q */
        87: { row: 11, mask: 0x2 }, /* W */
        69: { row: 10, mask: 0x2 }, /* E */
        82: { row: 9, mask: 0x2 }, /* R */
        84: { row: 8, mask: 0x2 }, /* T */
        89: { row: 7, mask: 0x2 }, /* Y */
        85: { row: 6, mask: 0x2 }, /* U */
        73: { row: 5, mask: 0x2 }, /* I */
        79: { row: 4, mask: 0x2 }, /* O */
        80: { row: 3, mask: 0x2 }, /* P */
        38: { row: 2, mask: 0x2 }, /* up arrow */
        40: { row: 1, mask: 0x2 }, /* down arrow */
        36: { row: 0, mask: 0x2 }, /* copy = home*/

        17: { row: 13, mask: 0x4 }, /* ctrl - gah, firefox screws up ctrl+key too */
        65: { row: 12, mask: 0x4 }, /* A */
        83: { row: 11, mask: 0x4 }, /* S */
        68: { row: 10, mask: 0x4 }, /* D */
        70: { row: 9, mask: 0x4 }, /* F */
        71: { row: 8, mask: 0x4 }, /* G */
        72: { row: 7, mask: 0x4 }, /* H */
        74: { row: 6, mask: 0x4 }, /* J */
        75: { row: 5, mask: 0x4 }, /* K */
        76: { row: 4, mask: 0x4 }, /* L */
        59: { row: 3, mask: 0x4 }, /* ; */
        222: { row: 2, mask: 0x4 }, /* : */
        13: { row: 1, mask: 0x4 }, /* enter */
        //??: {row: 0, mask: 0x4}, /* none */

        16: { row: 13, mask: 0x8 }, /* shift */
        90: { row: 12, mask: 0x8 }, /* Z */
        88: { row: 11, mask: 0x8 }, /* X */
        67: { row: 10, mask: 0x8 }, /* C */
        86: { row: 9, mask: 0x8 }, /* V */
        66: { row: 8, mask: 0x8 }, /* B */
        78: { row: 7, mask: 0x8 }, /* N */
        77: { row: 6, mask: 0x8 }, /* M */
        188: { row: 5, mask: 0x8 }, /* , */
        190: { row: 4, mask: 0x8 }, /* . */
        191: { row: 3, mask: 0x8 }, /* / */
        //??: {row: 2, mask: 0x8}, /* none */
        8: { row: 1, mask: 0x8 }, /* delete */
        32: { row: 0, mask: 0x8 }, /* space */

        999: null
    };

    function keyDown(evt) {
        if (self.active) {
            registerKeyDown(evt.keyCode);
            if (!evt.metaKey) return false;
        }
    }
    function registerKeyDown(keyNum) {
        var keyCode = keyCodes[keyNum];
        if (keyCode == null) return;
        keyStates[keyCode.row] |= keyCode.mask;
        //if (keyCode.caps) keyStates[0] &= 0xfe;
    }
    function keyUp(evt) {
        registerKeyUp(evt.keyCode);
        if (self.active && !evt.metaKey) return false;
    }
    function registerKeyUp(keyNum) {
        var keyCode = keyCodes[keyNum];
        if (keyCode == null) return;
        keyStates[keyCode.row] &= ~(keyCode.mask);
        //if (keyCode.caps) keyStates[0] |= 0x01;
    }

    function keyPress(evt) {
        if (self.active && !evt.metaKey) return false;
    }


    self.readkeys = function (addr) {

        var key = 0;

        for (var i = 0; i < 14; i++) {
            if (!(addr & (1 << i))) {
                key = key | keyStates[i];
            }
        }

        return key;
    }

    function autoKeyPress() {

        var val = autoKeyValues.shift();
        var dir = val.substr(val.length - 1);
        val = val.substr(0, val.length - 1);

        if (dir == "0") {
            registerKeyUp(val);
        }
        else {
            registerKeyDown(val);
        }

        if (autoKeyValues.length > 0) {
            setTimeout(autoKeyPress, 40);
        }
        else {
            autoKeys = false;
        }
    }

    self.autoLoad = function () {
        autoKeys = true;
        autoKeyValues.push("671");
        autoKeyValues.push("670");
        autoKeyValues.push("721");
        autoKeyValues.push("720");
        autoKeyValues.push("1901");
        autoKeyValues.push("1900");
        autoKeyValues.push("161");
        autoKeyValues.push("501");
        autoKeyValues.push("500");
        autoKeyValues.push("501");
        autoKeyValues.push("500");
        autoKeyValues.push("160");
        autoKeyValues.push("131");
        autoKeyValues.push("130");
        setTimeout(autoKeyPress, 500);
    }

    document.onkeydown = keyDown;
    document.onkeyup = keyUp;
    document.onkeypress = keyPress;

    return self;
}

	