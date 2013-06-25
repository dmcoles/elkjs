// tape emulation routines for ElkJs
// written by Darren Coles

ElkJs.Tape = function(opts) {
	var self = {};

	var uef = opts.uef;
	var processor = opts.processor;
	var sheila = opts.sheila;

	var oldMotor = false;
	
	var lastData = 0;
	
	self.process = function() {

		if (oldMotor!=sheila.tapeMotor) {
			if (sheila.tapeMotor) {
				uef.startTape();
			}
			else {
				uef.stopTape();
			}
		}
	
		if (sheila.tapeMotor) 
			uef.process();

		oldMotor = sheila.tapeMotor;
	}
	
	
	return self;
}