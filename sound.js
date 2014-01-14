// sound emulation routines for ElkJs
// written by Darren Coles

ElkJs.Sound = function (opts) {
    var self = {};

    var samplesPerFrame = 882;

    var sheila = opts.sheila;

    var audioContext = null;
    var audioOutput = null;
    var audioNode = null;
    var audioBuffer = null;

    var soundEnabled = true;

    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
        /* Use Web Audio API */
        audioBuffer = new Array();

        var audioContext = new AudioContext();
        if (audioContext.createJavaScriptNode != null) {
            var audioNode = audioContext.createJavaScriptNode(2048, 1, 1);
        } else if (audioContext.createScriptProcessor != null) {
            var audioNode = audioContext.createScriptProcessor(2048, 1, 1);
        } else {
            var audioNode = null;
        }

        if (audioNode != null) {
            onAudioProcess = function (e) {
                var buffer = e.outputBuffer.getChannelData(0);
                fillBuffer(buffer);
            };

            audioNode.onaudioprocess = onAudioProcess;
            audioNode.connect(audioContext.destination);
        }
    }
    else if (typeof (Audio) != 'undefined') {
        audioOutput = new Audio();
        if (typeof (audioOutput.mozSetup) != 'undefined') {
            /* Use audio data api */
            audioBuffer = new Array();
            audioOutput.mozSetup(1, samplesPerFrame * 50);
        } else {
            audioOutput = null;
        }
    }


    var sampleCount = 0;
    var sampleValue = 1;

    var frameSamples = 0;

    var frameCount = 0;

    var rowCount = 0;

    function fillBuffer(outputArray) {
        var n = outputArray.length;
        var i = 0;
        var i2 = 0;
        if (!soundEnabled) {
            audioBuffer.length = 0;
            return;
        }

        while ((audioBuffer.length + i) < n) {
            outputArray[i++] = 0;
        }

        while (i < n) {
            outputArray[i++] = audioBuffer[i2++];
        }

        audioBuffer.splice(0, i2);

    }

    function makeSample(freq, mode, count) {
        if (audioBuffer == null) return;
        for (var i = 0; i < count; i++) {
            frameSamples++;
            if (mode != 1) {
                audioBuffer.push(0);
            }
            else if (!freq) {
                audioBuffer.push(sampleValue);
            }
            else {
                audioBuffer.push(sampleValue);

                if ((sampleCount++) > 44100 / freq / 2) {
                    sampleCount = 0;
                    sampleValue = -sampleValue;
                }
            }
        }
    }

    function writeSampleData(soundIsEnabled) {
        soundEnabled = soundIsEnabled;
        if (soundEnabled & frameCount >= 5 & audioOutput != null) {
            numberSamplesWritten = audioOutput.mozWriteAudio(audioBuffer);
            audioBuffer.splice(0, numberSamplesWritten);
        }


    }

    self.startFrame = function () {
        rowCount = 0;
        frameSamples = 0;
        frameCount++;
    }

    self.endFrame = function (enabled) {
        makeSample(sheila.soundFreq, sheila.soundMode, samplesPerFrame - frameSamples);
        writeSampleData(enabled);
    }

    self.processRow = function () {
        rowCount++
        makeSample(sheila.soundFreq, sheila.soundMode, samplesPerFrame / 312 * rowCount - frameSamples);

    }

    return self;
}