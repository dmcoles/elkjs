// sheila emulation routines for ElkJs
// written by Darren Coles

ElkJs.Sheila = function() {
	var self = {};

	var interrupt_status = new Object();

	interrupt_status.nmi = false;
	interrupt_status.high_tone = false;
	interrupt_status.rtc = false;
	interrupt_status.display_end = false;
	interrupt_status.power_on = true;

	var interrupt_enable = new Object();
	interrupt_enable.massterIRQ = false;
	interrupt_enable.reset = false;
	interrupt_enable.display_end = false;
	interrupt_enable.rtc = false;
	interrupt_enable.transmit = false;
	interrupt_enable.receive = false;
	interrupt_enable.high_tone= false;
	
	self.interrupt = false;
	
	var paletteRegs = new Array(8);
	
	self.soundFreq = 0;
	self.soundMode = 0;
	
	self.romBank = 0;
	//self.intRomBank = 0;
	//self.extRom = 0;	
	self.screenMode = 0;

	var screenaddrLo = 0;
	var screenaddrHi = 0;

	var tapeData = 0;
	
	self.caps = false;
	self.tapeMotor = false;
	
	self.palette = new Array(16);
	for (var i = 0; i<16; i++) self.palette[i] = 0;

	self.casetteDataRead = false;
	
//FEx0 - interrupt status and control (R/W)
//	7 - not used
//	6 - high tone detect
//	5 - transmit data empty
//	4 - receive data full
//	3 - realtime clock
//	2 - display end interrupt
//	1 - power on reset
//	0 - master IRQ
//FEx2/3 - screen start (W)
//FEx4 - cassette data shift register (R/W)
//FEx5 - interrupt clear and paging (W)
//	7 - NMI
//	6 - High tone
//	5 - RTC
//	4 - frame end
//	3 - rom page enable
//	2/1/0 - rom paging
//FEx6 - the counter (W)
//	sound and casette data timing
//FEx7 - misc control (W)
//	7 - caps lock
//	6 - casette motor
//	5/4/3 - screen mode
//	2/1/0 - 00 - casette input, 01 - sound generation, 10 - casette output, 11 - unused
//FEx8 - FExF - palette (W)

	function updatePalette(cols, reg0, reg1) {
			if (cols[0]!=-1) {
				self.palette[cols[0]] |= 4;
				self.palette[cols[0]] ^= ((paletteRegs[reg0] & 16)? 4: 0);
			}
			if (cols[1]!=-1) {
				self.palette[cols[1]] |= 4;
				self.palette[cols[1]] ^= ((paletteRegs[reg0] & 32)? 4: 0);
			}
			if (cols[2]!=-1) {
				self.palette[cols[2]] |= 6;
				self.palette[cols[2]] ^= ((paletteRegs[reg0] & 4)? 2: 0) | ((paletteRegs[reg0] & 64)? 4: 0);
			}
			if (cols[3]!=-1) {
				self.palette[cols[3]] |= 6;
				self.palette[cols[3]] ^= ((paletteRegs[reg0] & 8)? 2: 0) | ((paletteRegs[reg0] & 128)? 4: 0);
			}	
			
			if (cols[0]!=-1) {
				self.palette[cols[0]] |= 3;
				self.palette[cols[0]] ^= ((paletteRegs[reg1] & 1)? 1: 0) | ((paletteRegs[reg1] & 16)? 2: 0);
			}
			if (cols[1]!=-1) {
				self.palette[cols[1]] |= 3;
				self.palette[cols[1]] ^= ((paletteRegs[reg1] & 2)? 1: 0) | ((paletteRegs[reg1] & 32)? 2: 0);
			}
			if (cols[2]!=-1) {
				self.palette[cols[2]] |= 1;
				self.palette[cols[2]] ^= ((paletteRegs[reg1] & 4)? 1: 0);
			}
			if (cols[3]!=-1) {
				self.palette[cols[3]] |= 1;
				self.palette[cols[3]] ^=  ((paletteRegs[reg1] & 8)? 1: 0);
			}
	}

	function recalcPalette() {
		var cols = new Array(4);
		switch (self.screenMode) {
			case 0:
			case 3:
			case 4:
			case 6:
			case 7:
				cols[0] = 0;
				cols[1] = -1;
				cols[2] = 1;
				cols[3] = -1;
				updatePalette(cols,0,1);
				break;
			
			case 1:
			case 5:
				cols[0] = 0;
				cols[1] = 1;
				cols[2] = 2;
				cols[3] = 3;
				updatePalette(cols,0,1);
				break;
			
			case 2:
				cols[0] = 0;
				cols[1] = 2;
				cols[2] = 8;
				cols[3] = 10;
				updatePalette(cols,0,1);

				cols[0] = 4;
				cols[1] = 6;
				cols[2] = 12;
				cols[3] = 14;
				updatePalette(cols,2,3);

				cols[0] = 5;
				cols[1] = 7;
				cols[2] = 13;
				cols[3] = 15;
				updatePalette(cols,4,5);

				cols[0] = 1;
				cols[1] = 3;
				cols[2] = 9;
				cols[3] = 11;
				updatePalette(cols,6,7);
				
				break;
					
		}
				
	}

	function check_interrupts() {
		self.interrupt = ((interrupt_enable.display_end & interrupt_status.display_end) | (interrupt_enable.rtc & interrupt_status.rtc) | (interrupt_enable.high_tone & interrupt_status.high_tone) | 
		(interrupt_enable.receive & interrupt_status.receive) | interrupt_enable.transmit & interrupt_status.transmit);
	}
	
	self.trigger_vbl = function() {
		interrupt_status.display_end = true;
		check_interrupts();
	}
	
	self.trigger_rtc = function() {
		interrupt_status.rtc = true;
		check_interrupts();
	}

	self.trigger_hightone = function() {
		interrupt_status.high_tone = true;
		check_interrupts();
	}

	self.trigger_receive = function() {
		interrupt_status.receive = true;
		check_interrupts();
	}

	self.clear_receive = function() {
		interrupt_status.receive = false;
		check_interrupts();
	}

	self.reset = function() {
		interrupt_enable.massterIRQ = false;
		interrupt_enable.reset = false;
		interrupt_enable.display_end = false;
		interrupt_enable.rtc = false;
		interrupt_enable.transmit = false;
		interrupt_enable.receive = false;
		interrupt_enable.high_tone= false;

		interrupt_status.nmi = false;
		interrupt_status.high_tone = false;
		interrupt_status.rtc = false;
		interrupt_status.display_end = false;
		interrupt_status.receive = false;
		interrupt_status.transmit = false;

		interrupt_status.power_on = true;
		
		self.caps = false;
		self.tapeMotor = false;

	}

	self.write = function(addr,val) {
	
		addr = addr & 0xf;
		
		if (addr == 0) {
			interrupt_enable.massterIRQ = (val & 0x1) != 0;
			interrupt_enable.reset = (val & 0x2) != 0;
			interrupt_enable.display_end = (val & 0x4) != 0;
			interrupt_enable.rtc = (val & 0x8) != 0;
			interrupt_enable.receive = (val & 0x10) != 0;
			interrupt_enable.transmit = (val & 0x20) != 0;
			interrupt_enable.high_tone= (val & 0x40) != 0;
			check_interrupts();
		}
	
		if (addr == 2) {
			//FEx2 (screen start low)
			screenaddrLo = val;
		}
		else if (addr == 3) {
			//FEx3 (screen start high)
			screenaddrHi = val;
		}
		else if (addr == 4) {
			tapeData = val;
			interrupt_status.transmit = false;
		}
		else if (addr == 5) {
            if ((val&0xf)>=8) self.romBank=val&0xF;
            else if (self.romBank>=0xC | self.romBank<8)
            {
				self.romBank=val&0xF;
            }
            if (val&0x10) interrupt_status.display_end = false;
            if (val&0x20) interrupt_status.rtc = false;
            if (val&0x40) interrupt_status.high_tone = false;
			check_interrupts();
		}
		else if (addr == 6) {
			//if (self.soundMode==1) {
				self.soundFreq = 1000000 / (16 * (val + 1));
			//}
		}
		else if (addr == 7) {
			//FEx7 (misc control)
			self.caps = (val & 0x80) != 0;
			
			self.tapeMotor = (val & 0x40) != 0;
			self.screenMode = (val & 0x38) >> 3;
			recalcPalette();
			self.soundMode = (val &6)>>1;
			//if (self.soundMode!=1) {
			//	self.soundFreq=0;
			//}
			
		}
		else if (addr>7) {
			paletteRegs[addr-8] = val;
			recalcPalette();										
		}
	}
	
	self.read = function(addr) {
		addr = addr & 0xf;
		
		if (addr == 0) {
			var v = 0;
			
			if (interrupt_status.display_end) v |= 4;
			if (interrupt_status.rtc) v |= 8;
			if (interrupt_status.high_tone) v |= 64;
			
			if (interrupt_status.receive) v |= 16;
			if (interrupt_status.transmit) v |= 32;
			
			if (v) v|=1;
			if (interrupt_status.power_on) v |= 2;		
			
			interrupt_status.power_on = false;					
			
			return v | 0x80;
			
			
		}
		else if (addr == 4) {
			interrupt_status.receive = false;
			self.casetteDataRead = true;			
			return tapeData;
		}
		
		return undefined;
	}
	
	self.loadSnapshot = function(buffer,offset) {
		//ier
		//isr
		//screen low 0xfe02)
		//screen high (0xfe03)
		//casette (0xfe04)
		//rom page - 0xfe05
		//current rom
		//fe06,fe07,fe08,fe09,fe0a,fe0b,fe0c,fe0d,fe0e,fe0f
		//4 bytes - number of 16mhz cycles since last display end interrupt
	
		self.write(0xfe00, buffer[offset+0]);
		
		v = buffer[offset+1];
		interrupt_status.power_on = (v & 2) !=0;
		interrupt_status.display_end = (v & 4)!=0;
		interrupt_status.rtc = (v & 8) !=0;
		interrupt_status.receive =  (v & 16) !=0;
		interrupt_status.transmit =  (v & 32) !=0;
		interrupt_status.high_tone =  (v & 64) !=0;	
			
		self.write(0xfe02, buffer[offset+2]);
		self.write(0xfe03, buffer[offset+3]);
		self.write(0xfe04, buffer[offset+4]);
		self.write(0xfe05, buffer[offset+5]);
		self.romBank = buffer[offset+6]&0xf;
		//self.intRomBank=self.romBank;
		for (var i = 6; i<16; i++) {
			self.write(0xfe00+i, buffer[offset+i+1]);  //fe06,fe07,fe08,fe09,fe0a,fe0b,fe0c,fe0d,fe0e,fe0f
		}
		
		
	}
	
	self.getScreenAddress = function() {
		return ((screenaddrLo&224)<<1)+((screenaddrHi&63)<<9);
	}
	
	self.addTapeBit = function(data) {
		if (data) {
			tapeData=(tapeData>>1) | 0x80;
		}
		else {
			tapeData>=1;
		}
	}

	self.setTapeData = function(data) {
		tapeData = data;
	}

	return self;
}