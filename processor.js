// 6502 cpu emulator code for ElkJs
// written by Darren Coles

ElkJs.Processor = function(opts) {
	var self = {};

	var memory = opts.memory;
	var tape = opts.tape;
	var sheila = opts.sheila;
	var display = opts.display;
	
	memory.setProcessor(self);
	
	var timetolive = 0;
	var ins=0;
	var ulacycles = 0;
	var a,x,y,s = 0;
	var pc = 0;
	var p = new Object();
	
	var cycles = 0;
	var cyccount=1;
	var cpureset=0;
	var otherstuffcount=0;
	
	var opcode = 0;
	
	var realnmi = 0;
	var realirq = 0;

	var nmi = 0;
	var irq = 0;
	
	var output=0;
	var oldpc2;
	var oldpc;
	
	/*ADC/SBC temp variables*/
	var tempw;
	var tempv,hc,al,ah;
	var tempb;

	var motoron=0;
	var motorspin=0;
	var plus1=0;
	var adctime=0;
	var tapespeed=0;
	var tapewrite=0;
	var TAPE_REALLY = 1;//???
	
	function setzn(v)
	{
        p.z=!v;
        p.n=v&0x80;
	}
	
	function setadc( v)
	{
        var tempw=a+v+(p.c&1);
		
        p.z=!(tempw&0xFF);
        p.n=tempw&0x80;
        p.c=tempw&0x100;
        p.v=(!((a^v)&0x80)&&((a^tempw)&0x80));
	}
	
	function setsbc(temp)
	{
        var tempw=a-(temp+(p.c&1^1));
        var tempv=a-(temp+(p.c&1^1));
        p.v=((a^(temp+(p.c&1^1)))&(a^tempv)&0x80);
        p.c=tempv>=0;
        setzn(tempw&0xFF);
	}
	
	function doints()
	{
        irq=sheila.interrupt;
        if (nmi) realnmi=1;
        realirq=irq;
        nmi=0;
	}

	function ADCBCD(temp, tempc)
	{
        //printf("BCD ADC!\n");
        //dumpregs();
        //exit(-1);
	}

	function SBCBCD(temp, tempc)
	{
        //printf("BCD SBC!\n");
        //dumpregs();
        //exit(-1);
	}
	
	function ADC(temp) {
		if (!p.d)                            
        {                                  
            tempw=(a+temp+(p.c?1:0));
            p.v=(!((a^temp)&0x80)&&((a^tempw)&0x80));
            a=tempw&0xFF;
            p.c=tempw&0x100;
            setzn(a);
		}                                  
		else                               
		{                                  
			ah=0;
			tempb=a+temp+(p.c?1:0);
			if (!tempb) {
			   p.z=1;
			}
			al=(a&0xF)+(temp&0xF)+(p.c?1:0);
			if (al>9)
			{
					al-=10;
					al&=0xF;
					ah=1;
			}
			ah+=((a>>4)+(temp>>4));
			if (ah&8) p.n=1;
			p.v=(((ah << 4) ^ a) & 128) && !((a ^ temp) & 128);
			p.c=0;
			if (ah>9)
			{
					p.c=1;
					ah-=10;
					ah&=0xF;
			}
			a=(al&0xF)|(ah<<4);
		}
	}
	
	function SBC(temp) {
		if (!p.d)                            
		{                 
			tempw=a-(temp+(p.c?0:1));
			tempv=a-(temp+(p.c?0:1));
			p.v=((a^(temp+(p.c?0:1)))&(a^tempv)&0x80);
			p.c=tempv>=0;
			a=tempw&0xFF;
			setzn(a);
		}                                  
		else                               
		{                                  
			hc=0;
			p.z=p.n=0;
			if (!((a-temp)-((p.c)?0:1))) {
			   p.z=1;
			}
			al=(a&15)-(temp&15)-((p.c)?0:1);
			if (al&16)
			{
					al-=6;
					al&=0xF;
					hc=1;
			}
			ah=(a>>4)-(temp>>4);
			if (hc) ah--;
			if ((a-(temp+((p.c)?0:1)))&0x80)
			   p.n=1;
			p.v=(((a-(temp+((p.c)?0:1)))^temp)&128)&&((a^temp)&128);
			p.c=1;
			if (ah&16)
			{
					p.c=0;
					ah-=6;
					ah&=0xF;
			}
			a=(al&0xF)|((ah&0xF)<<4);
		}			
	}

	self.exec6502 = function()	{
        var addr;
		var addr2;
        var temp;
        var tempc;
        var oldcycs;
        while (cycles<128) {
			oldpc2=oldpc;
			oldpc=pc;
			oldcycs=cycles;
//                if (pc==0x1000) output=1;
//                if (pc>0xE00 && pc<0x5000) output=1;
//                if (pc==0xFFEE && a==65) output=0;
			if (output)
			{
//					rpclog("PC=%04X A=%02X X=%02X Y=%02X S=%02X %i %i %i\n",pc,a,x,y,s,p.i,extrom,rombank);
//                        dumpram();
//                        fflush(stdout);
			}
			opcode=memory.readmem(pc);
			//if (debugon) dodebugger();
			pc++;
			cycles+=cyccount;
						
			switch (opcode)
			{
					case 0x00: /*BRK*/
					if (output)
					{
							rpclog("BRK!\n");
							dumpregs();
					}
					temp =(p.c)?1:0;    temp|=(p.z)?2:0;
					temp|=(p.i)?4:0;    temp|=(p.d)?8:0;
					temp|=(p.v)?0x40:0; temp|=(p.n)?0x80:0;
					temp|=0x30;
					pc++;
					memory.writemem(0x100+s,pc>>8);   s--; cycles+=cyccount;
					memory.writemem(0x100+s,pc&0xFF); s--; cycles+=cyccount;
					memory.writemem(0x100+s,temp);    s--; cycles+=cyccount;
					pc=memory.readmem(0xFFFE);             cycles+=cyccount;
					pc|=(memory.readmem(0xFFFF)<<8);       cycles+=cyccount;
					p.i=1;
					cycles+=cyccount;
					break;
					case 0x08: /*PHP*/
					temp =(p.c)?1:0;    temp|=(p.z)?2:0;
					temp|=(p.i)?4:0;    temp|=(p.d)?8:0;
					temp|=(p.v)?0x40:0; temp|=(p.n)?0x80:0;
					temp|=0x30;
					memory.readmem(pc);    cycles+=cyccount;
					doints();
					memory.writemem(0x100+s,temp); s--; cycles+=cyccount;
//                        printf("It's the PHP\n");
					break;
					case 0x0A: /*ASL A*/
					doints();
					memory.readmem(pc); cycles+=cyccount;
					p.c=a&0x80;
					a=(a<<1)&0xff;
					setzn(a);
					break;
					case 0x18: /*CLC*/
					doints();
					memory.readmem(pc);
					p.c=0;
					cycles+=cyccount;
					break;
					case 0x28: /*PLP*/
					memory.readmem(pc);           cycles+=cyccount;
					memory.readmem(0x100+s); s++; cycles+=cyccount;
					doints();
					temp=memory.readmem(0x100+s);    cycles+=cyccount;
					p.c=temp&1; p.z=temp&2; p.i=temp&4; p.d=temp&8;
					p.v=temp&0x40; p.n=temp&0x80;
					break;
					case 0x2A: /*ROL A*/
					doints();
					memory.readmem(pc);
					tempc=(p.c)?1:0;
					p.c=a&0x80;
					a=(a<<1)&0xff;
					a|=tempc;
					setzn(a);
					cycles+=cyccount;
					break;
					case 0x38: /*SEC*/
					doints();
					memory.readmem(pc);
					p.c=1;
					cycles+=cyccount;
					break;
					case 0x48: /*PHA*/
					memory.readmem(pc);    cycles+=cyccount;
					doints();
					memory.writemem(0x100+s,a); s--; cycles+=cyccount;
					break;
					case 0x4A: /*LSR A*/
					doints();
					memory.readmem(pc); cycles+=cyccount;
					p.c=a&1;
					a>>=1;
					setzn(a);
					break;
					case 0x58: /*CLI*/
					doints();
					memory.readmem(pc);
					p.i=0;
					cycles+=cyccount;
					break;
					case 0x68: /*PLA*/
					memory.readmem(pc);           cycles+=cyccount;
					memory.readmem(0x100+s); s++; cycles+=cyccount;
					doints();
					a=memory.readmem(0x100+s);    cycles+=cyccount;
					setzn(a);
					break;
					case 0x6A: /*ROR A*/
					doints();
					memory.readmem(pc);
					tempc=(p.c)?0x80:0;
					p.c=a&1;
					a>>=1;
					a|=tempc;
					setzn(a);
					cycles+=cyccount;
					break;
					case 0x78: /*SEI*/
					doints();
					memory.readmem(pc);
					p.i=1;
					cycles+=cyccount;
					break;
					case 0x88: /*DEY*/
					doints();
					memory.readmem(pc);
					y=(y-1)&0xff;
					setzn(y);
					cycles+=cyccount;
					break;
					case 0x8A: /*TXA*/
					doints();
					memory.readmem(pc);
					a=x;
					setzn(a);
					cycles+=cyccount;
					break;
					case 0x98: /*TYA*/
					doints();
					memory.readmem(pc);
					a=y;
					setzn(a);
					cycles+=cyccount;
					break;
					case 0x9A: /*TXS*/
					doints();
					memory.readmem(pc);
					s=x;
					cycles+=cyccount;
					break;
					case 0xA8: /*TAY*/
					doints();
					memory.readmem(pc);
					y=a;
					setzn(y);
					cycles+=cyccount;
					break;
					case 0xAA: /*TAX*/
					doints();
					memory.readmem(pc);
					x=a;
					setzn(x);
					cycles+=cyccount;
					break;
					case 0xB8: /*CLV*/
					doints();
					memory.readmem(pc);
					p.v=0;
					cycles+=cyccount;
					break;
					case 0xBA: /*TSX*/
					doints();
					memory.readmem(pc);
					x=s;
					setzn(x);
					cycles+=cyccount;
					break;
					case 0xC8: /*INY*/
					doints();
					memory.readmem(pc);
					y=(y+1)&0xff;
					setzn(y);
					cycles+=cyccount;
					break;
					case 0xCA: /*DEX*/
					doints();
					memory.readmem(pc);
					x=(x-1)&0xff;
					setzn(x);
					cycles+=cyccount;
					break;
					case 0xD8: /*CLD*/
					doints();
					memory.readmem(pc);
					p.d=0;
					cycles+=cyccount;
					break;
					case 0xE8: /*INX*/
					doints();
					memory.readmem(pc);
					x=(x+1)&0xff;
					setzn(x);
					cycles+=cyccount;
					break;
					case 0x1A: case 0x3A: case 0x5A: case 0x7A: /*NOP*/
					case 0xDA: case 0xEA: case 0xFA:
					doints();
					memory.readmem(pc);
					cycles+=cyccount;
					break;
					case 0xF8: /*SED*/
					doints();
					memory.readmem(pc);
					p.d=1;
					cycles+=cyccount;
					break;

					case 0x09: /*ORA #*/
					doints();
					temp=memory.readmem(pc); pc++; cycles+=cyccount;
					a|=temp; setzn(a);
					break;
					case 0x29: /*AND #*/
					doints();
					temp=memory.readmem(pc); pc++; cycles+=cyccount;
					a&=temp; setzn(a);
					break;
					case 0x49: /*EOR #*/
					doints();
					temp=memory.readmem(pc); pc++; cycles+=cyccount;
					a^=temp; setzn(a);
					break;
					case 0x69: /*ADC #*/
					doints();
					tempc=(p.c)?1:0;
					temp=memory.readmem(pc); pc++; cycles+=cyccount;
					ADC(temp);
					break;
					case 0x89: /*NOP #*/
					doints();
					memory.readmem(pc); pc++; cycles+=cyccount;
					break;
					case 0xA0: /*LDY #*/
					doints();
					y=memory.readmem(pc); pc++; cycles+=cyccount;
					setzn(y);
					break;
					case 0xA2: /*LDX #*/
					doints();
					x=memory.readmem(pc); pc++; cycles+=cyccount;
					setzn(x);
					break;
					case 0xA9: /*LDA #*/
					doints();
					a=memory.readmem(pc); pc++; cycles+=cyccount;
					setzn(a);
					break;
					case 0xC0: /*CPY #*/
					doints();
					temp=memory.readmem(pc); pc++; cycles+=cyccount;
					setzn(y-temp);
					p.c=(y>=temp);
					break;
					case 0xC9: /*CMP #*/
					doints();
					temp=memory.readmem(pc); pc++; cycles+=cyccount;
					setzn(a-temp);
					p.c=(a>=temp);
					break;
					case 0xE0: /*CPX #*/
					doints();
					temp=memory.readmem(pc); pc++; cycles+=cyccount;
					setzn(x-temp);
					p.c=(x>=temp);
					break;
					case 0xE9: /*SBC #*/
					doints();
					tempc=(p.c)?0:1;
					temp=memory.readmem(pc); pc++; cycles+=cyccount;
					SBC(temp);
					break;

					case 0x04: case 0x44: case 0x64: /*NOP zp*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					doints();
					memory.readmem(addr);
					cycles+=cyccount;
					break;
					case 0x05: /*ORA zp*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					doints();
					temp=memory.readmem(addr); cycles+=cyccount;
					a|=temp;
					setzn(a);
					break;
					case 0x06: /*ASL zp*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					temp=memory.readmem(addr); cycles+=cyccount;
					memory.writemem(addr,temp); p.c=temp&0x80; temp=(temp<<1)&0xff; setzn(temp); cycles+=cyccount;
					doints();
					memory.writemem(addr,temp); cycles+=cyccount;
					break;
					case 0x24: /*BIT zp*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					doints();
					temp=memory.readmem(addr);
					p.z=!(temp&a);
					p.v=temp&0x40;
					p.n=temp&0x80;
					cycles+=cyccount;
					break;
					case 0x25: /*AND zp*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					doints();
					temp=memory.readmem(addr); cycles+=cyccount;
					a&=temp;
					setzn(a);
					break;
					case 0x26: /*ROL zp*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					temp=memory.readmem(addr); cycles+=cyccount;
					memory.writemem(addr,temp);  cycles+=cyccount;
					tempc=(p.c)?1:0;
					p.c=temp&0x80;
					temp=(temp<<1)&0xff;
					temp|=tempc;
					setzn(temp);
					doints();
					memory.writemem(addr,temp); cycles+=cyccount;
					break;
					case 0x45: /*EOR zp*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					doints();
					temp=memory.readmem(addr); cycles+=cyccount;
					a^=temp;
					setzn(a);
					break;
					case 0x46: /*LSR zp*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					temp=memory.readmem(addr); cycles+=cyccount;
					memory.writemem(addr,temp); p.c=temp&1; temp>>=1; setzn(temp); cycles+=cyccount;
					doints();
					memory.writemem(addr,temp); cycles+=cyccount;
					break;
					case 0x65: /*ADC zp*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					doints();
					temp=memory.readmem(addr); cycles+=cyccount;
					tempc=(p.c)?1:0;
					ADC(temp);
					break;
					case 0x66: /*ROR zp*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					temp=memory.readmem(addr); cycles+=cyccount;
					memory.writemem(addr,temp); cycles+=cyccount;
					tempc=(p.c)?0x80:0;
					p.c=temp&1;
					temp>>=1;
					temp|=tempc;
					setzn(temp);
					doints();
					memory.writemem(addr,temp); cycles+=cyccount;
					break;
					case 0x84: /*STY zp*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					doints();
					memory.writemem(addr,y);
					cycles+=cyccount;
					break;
					case 0x85: /*STA zp*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					doints();
					memory.writemem(addr,a);
					cycles+=cyccount;
					break;
					case 0x86: /*STX zp*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					doints();
					memory.writemem(addr,x);
					cycles+=cyccount;
					break;
					case 0xA4: /*LDY zp*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					doints();
					y=memory.readmem(addr);
					setzn(y);
					cycles+=cyccount;
					break;
					case 0xA5: /*LDA zp*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					doints();
					a=memory.readmem(addr);
					setzn(a);
					cycles+=cyccount;
					break;
					case 0xA6: /*LDX zp*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					doints();
					x=memory.readmem(addr);
					setzn(x);
					cycles+=cyccount;
					break;
					case 0xC4: /*CPY zp*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					doints();
					temp=memory.readmem(addr); cycles+=cyccount;
					setzn(y-temp);
					p.c=(y>=temp);
					break;
					case 0xC5: /*CMP zp*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					doints();
					temp=memory.readmem(addr); cycles+=cyccount;
					setzn(a-temp);
					p.c=(a>=temp);
					break;
					case 0xC6: /*DEC zp*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					temp=memory.readmem(addr); cycles+=cyccount;
					memory.writemem(addr,temp); temp=(temp-1)&0xff; setzn(temp); cycles+=cyccount;
					doints();
					memory.writemem(addr,temp); cycles+=cyccount;
					break;
					case 0xE4: /*CPX zp*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					doints();
					temp=memory.readmem(addr); cycles+=cyccount;
					setzn(x-temp);
					p.c=(x>=temp);
					break;
					case 0xE5: /*SBC zp*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					doints();
					temp=memory.readmem(addr); cycles+=cyccount;
					tempc=(p.c)?0:1;
					SBC(temp);
					break;
					case 0xE6: /*INC zp*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					temp=memory.readmem(addr); cycles+=cyccount;
					memory.writemem(addr,temp); temp=(temp+1)&0xff; setzn(temp); cycles+=cyccount;
					doints();
					memory.writemem(addr,temp); cycles+=cyccount;
					break;

					case 0x14: case 0x34: case 0x54: case 0x74: /*NOP zp,x*/
					case 0xD4: case 0xF4:
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					memory.readmem(addr); cycles+=cyccount;
					doints();
					memory.readmem((addr+x)&0xFF);
					cycles+=cyccount;
					break;
					case 0x15: /*ORA zp,x*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					memory.readmem(addr); cycles+=cyccount;
					doints();
					temp=memory.readmem((addr+x)&0xFF); cycles+=cyccount;
					a|=temp;
					setzn(a);
					break;
					case 0x16: /*ASL zp,x*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					memory.readmem(addr); cycles+=cyccount; addr=(addr+x)&0xFF;
					temp=memory.readmem(addr); cycles+=cyccount;
					memory.writemem(addr,temp); p.c=temp&0x80; temp=(temp<<1)&0xff; setzn(temp); cycles+=cyccount;
					doints();
					memory.writemem(addr,temp); cycles+=cyccount;
					break;
					case 0x35: /*AND zp,x*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					memory.readmem(addr); cycles+=cyccount;
					doints();
					temp=memory.readmem((addr+x)&0xFF); cycles+=cyccount;
					a&=temp;
					setzn(a);
					break;
					case 0x36: /*ROL zp,x*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					memory.readmem(addr); cycles+=cyccount; addr=(addr+x)&0xFF;
					temp=memory.readmem(addr); cycles+=cyccount;
					memory.writemem(addr,temp); cycles+=cyccount;
					tempc=(p.c)?1:0;
					p.c=temp&0x80;
					temp=(temp<<1)&0xff;
					temp|=tempc;
					setzn(temp);
					doints();
					memory.writemem(addr,temp); cycles+=cyccount;
					break;
					case 0x55: /*EOR zp,x*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					memory.readmem(addr); cycles+=cyccount;
					doints();
					temp=memory.readmem((addr+x)&0xFF); cycles+=cyccount;
					a^=temp;
					setzn(a);
					break;
					case 0x56: /*LSR zp,x*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					memory.readmem(addr); cycles+=cyccount; addr=(addr+x)&0xFF;
					temp=memory.readmem(addr); cycles+=cyccount;
					memory.writemem(addr,temp); p.c=temp&1; temp>>=1; setzn(temp); cycles+=cyccount;
					doints();
					memory.writemem(addr,temp); cycles+=cyccount;
					break;
					case 0x75: /*ADC zp,x*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					memory.readmem(addr); cycles+=cyccount; addr=(addr+x)&0xFF;
					doints();
					temp=memory.readmem(addr); cycles+=cyccount;
					tempc=(p.c)?1:0;
					ADC(temp);
					break;
					case 0x76: /*ROR zp,x*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					memory.readmem(addr); cycles+=cyccount; addr=(addr+x)&0xFF;
					temp=memory.readmem(addr); cycles+=cyccount;
					memory.writemem(addr,temp); cycles+=cyccount;
					tempc=(p.c)?0x80:0;
					p.c=temp&1;
					temp>>=1;
					temp|=tempc;
					setzn(temp);
					doints();
					memory.writemem(addr,temp); cycles+=cyccount;
					break;
					case 0x94: /*STY zp,x*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					memory.readmem(addr); cycles+=cyccount;
					doints();
					memory.writemem((addr+x)&0xFF,y);
					cycles+=cyccount;
					break;
					case 0x95: /*STA zp,x*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					memory.readmem(addr); cycles+=cyccount;
					doints();
					memory.writemem((addr+x)&0xFF,a);
					cycles+=cyccount;
					break;
					case 0x96: /*STX zp,y*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					memory.readmem(addr); cycles+=cyccount;
					doints();
					memory.writemem((addr+y)&0xFF,x);
					cycles+=cyccount;
					break;
					case 0xB4: /*LDY zp,x*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					memory.readmem(addr); cycles+=cyccount;
					doints();
					y=memory.readmem((addr+x)&0xFF);
					setzn(y);
					cycles+=cyccount;
					break;
					case 0xB5: /*LDA zp,x*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					memory.readmem(addr); cycles+=cyccount;
					doints();
					a=memory.readmem((addr+x)&0xFF);
					setzn(a);
					cycles+=cyccount;
					break;
					case 0xB6: /*LDX zp,y*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					memory.readmem(addr); cycles+=cyccount;
					doints();
					x=memory.readmem((addr+y)&0xFF);
					setzn(x);
					cycles+=cyccount;
					break;
					case 0xD5: /*CMP zp,x*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					memory.readmem(addr); cycles+=cyccount; addr=(addr+x)&0xFF;
					doints();
					temp=memory.readmem(addr); cycles+=cyccount;
					setzn(a-temp);
					p.c=(a>=temp);
					break;
					case 0xD6: /*DEC zp,x*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					memory.readmem(addr); cycles+=cyccount; addr=(addr+x)&0xFF;
					temp=memory.readmem(addr); cycles+=cyccount;
					memory.writemem(addr,temp); temp=(temp-1)&0xff; setzn(temp); cycles+=cyccount;
					doints();
					memory.writemem(addr,temp); cycles+=cyccount;
					break;
					case 0xF5: /*SBC zp,x*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					memory.readmem(addr); cycles+=cyccount; addr=(addr+x)&0xFF;
					doints();
					temp=memory.readmem(addr); cycles+=cyccount;
					tempc=(p.c)?0:1;
					SBC(temp);
					break;
					case 0xF6: /*INC zp,x*/
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					memory.readmem(addr); cycles+=cyccount; addr=(addr+x)&0xFF;
					temp=memory.readmem(addr); cycles+=cyccount;
					memory.writemem(addr,temp); temp=(temp+1)&0xff; setzn(temp); cycles+=cyccount;
					doints();
					memory.writemem(addr,temp); cycles+=cyccount;
					break;

					case 0x0C: /*NOP absolute*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					doints();
					memory.readmem(addr);
					cycles+=cyccount;
					break;
					case 0x0D: /*ORA absolute*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					doints();
					a|=memory.readmem(addr);
					setzn(a);
					cycles+=cyccount;
					break;
					case 0x0E: /*ASL absolute*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					temp=memory.readmem(addr);  cycles+=cyccount;
					memory.writemem(addr,temp); cycles+=cyccount;
					p.c=temp&0x80;
					temp=(temp<<1)&0xff;
					setzn(temp);
					doints();
					memory.writemem(addr,temp); cycles+=cyccount;
					break;
					case 0x2C: /*BIT absolute*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					doints();
					temp=memory.readmem(addr);
					p.z=!(temp&a);
					p.v=temp&0x40;
					p.n=temp&0x80;
					cycles+=cyccount;
					break;
					case 0x2D: /*AND absolute*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					doints();
					a&=memory.readmem(addr);
					setzn(a);
					cycles+=cyccount;
					break;
					case 0x2E: /*ROL absolute*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					temp=memory.readmem(addr);  cycles+=cyccount;
					memory.writemem(addr,temp); cycles+=cyccount;
					tempc=(p.c)?1:0;
					p.c=temp&0x80;
					temp=(temp<<1)&0xff;
					temp|=tempc;
					setzn(temp);
					doints();
					memory.writemem(addr,temp); cycles+=cyccount;
					break;
					case 0x2F: /*RLA absolute*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					temp=memory.readmem(addr);  cycles+=cyccount;
					memory.writemem(addr,temp); cycles+=cyccount;
					tempc=(p.c)?1:0;
					p.c=temp&0x80;
					temp=(temp<<1)&0xff;
					temp|=tempc;
					a&=temp;
					setzn(a);
					doints();
					memory.writemem(addr,temp); cycles+=cyccount;
					break;
					case 0x4D: /*EOR absolute*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					doints();
					a^=memory.readmem(addr);
					setzn(a);
					cycles+=cyccount;
					break;
					case 0x4E: /*LSR absolute*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					temp=memory.readmem(addr);  cycles+=cyccount;
					memory.writemem(addr,temp); cycles+=cyccount;
					p.c=temp&1;
					temp>>=1;
					setzn(temp);
					doints();
					memory.writemem(addr,temp); cycles+=cyccount;
					break;
					case 0x6D: /*ADC abs*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					doints();
					temp=memory.readmem(addr); cycles+=cyccount;
					tempc=(p.c)?1:0;
					ADC(temp);
					break;
					case 0x6E: /*ROR absolute*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					temp=memory.readmem(addr);  cycles+=cyccount;
					memory.writemem(addr,temp); cycles+=cyccount;
					tempc=(p.c)?0x80:0;
					p.c=temp&1;
					temp>>=1;
					temp|=tempc;
					setzn(temp);
					doints();
					memory.writemem(addr,temp); cycles+=cyccount;
					break;
					case 0x8C: /*STY absolute*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					doints();
					memory.writemem(addr,y);
					cycles+=cyccount;
					break;
					case 0x8D: /*STA absolute*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					doints();
					memory.writemem(addr,a);
					cycles+=cyccount;
					break;
					case 0x8E: /*STX absolute*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					doints();
					memory.writemem(addr,x);
					cycles+=cyccount;
					break;
					case 0xAC: /*LDY absolute*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					doints();
					y=memory.readmem(addr);
					setzn(y);
					cycles+=cyccount;
					break;
					case 0xAD: /*LDA absolute*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					doints();
					a=memory.readmem(addr);
					setzn(a);
					cycles+=cyccount;
					break;
					case 0xAE: /*LDX absolute*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					doints();
					x=memory.readmem(addr);
					setzn(x);
					cycles+=cyccount;
					break;
					case 0xCC: /*CPY absolute*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					doints();
					temp=memory.readmem(addr);
					setzn(y-temp);
					p.c=(y>=temp);
					cycles+=cyccount;
					break;
					case 0xCD: /*CMP absolute*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					doints();
					temp=memory.readmem(addr);
					setzn(a-temp);
					p.c=(a>=temp);
					cycles+=cyccount;
					break;
					case 0xCE: /*DEC absolute*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					temp=memory.readmem(addr); cycles+=cyccount;
					memory.writemem(addr,temp); temp=(temp-1)&0xff; setzn(temp); cycles+=cyccount;
					doints();
					memory.writemem(addr,temp); cycles+=cyccount;
					break;
					case 0xEC: /*CPX absolute*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					doints();
					temp=memory.readmem(addr);
					setzn(x-temp);
					p.c=(x>=temp);
					cycles+=cyccount;
					break;
					case 0xED: /*SBC abs*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					doints();
					temp=memory.readmem(addr); cycles+=cyccount;
					tempc=(p.c)?0:1;
					SBC(temp);
					break;
					case 0xEE: /*INC absolute*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					temp=memory.readmem(addr); cycles+=cyccount;
					memory.writemem(addr,temp); temp=(temp+1)&0xff; setzn(temp); cycles+=cyccount;
					doints();
					memory.writemem(addr,temp); cycles+=cyccount;
					break;

					case 0x19: /*ORA absolute,y*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					addr2=addr+y;
					if ((addr^addr2)&0xFF00)
					{
							memory.readmem((addr2&0xFF)|(addr&0xFF00)); cycles+=cyccount;
					}
					doints();
					a|=memory.readmem(addr2);
					setzn(a);
					cycles+=cyccount;
					break;
					case 0x1D: /*ORA absolute,x*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					addr2=addr+x;
					if ((addr^addr2)&0xFF00)
					{
							memory.readmem((addr2&0xFF)|(addr&0xFF00)); cycles+=cyccount;
					}
					doints();
					a|=memory.readmem(addr2);
					setzn(a);
					cycles+=cyccount;
					break;
					case 0x1E: /*ASL absolute,x*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount; addr2=addr+x;
					memory.readmem((addr&0xFF00)|(addr2&0xFF)); cycles+=cyccount;
					temp=memory.readmem(addr2);  cycles+=cyccount;
					memory.writemem(addr2,temp); cycles+=cyccount;
					p.c=temp&0x80;
					temp=(temp<<1)&0xff;
					setzn(temp);
					doints();
					memory.writemem(addr2,temp); cycles+=cyccount;
					break;
					case 0x39: /*AND absolute,y*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					addr2=addr+y;
					if ((addr^addr2)&0xFF00)
					{
							memory.readmem((addr2&0xFF)|(addr&0xFF00)); cycles+=cyccount;
					}
					doints();
					a&=memory.readmem(addr2);
					setzn(a);
					cycles+=cyccount;
					break;
					case 0x3D: /*AND absolute,x*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					addr2=addr+x;
					if ((addr^addr2)&0xFF00)
					{
							memory.readmem((addr2&0xFF)|(addr&0xFF00)); cycles+=cyccount;
					}
					doints();
					a&=memory.readmem(addr2);
					setzn(a);
					cycles+=cyccount;
					break;
					case 0x3E: /*ROL absolute,x*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount; addr2=addr+x;
					memory.readmem((addr&0xFF00)|(addr2&0xFF)); cycles+=cyccount;
					temp=memory.readmem(addr2);  cycles+=cyccount;
					memory.writemem(addr2,temp); cycles+=cyccount;
					tempc=(p.c)?1:0;
					p.c=temp&0x80;
					temp=(temp<<1)&0xff;
					temp|=tempc;
					setzn(temp);
					doints();
					memory.writemem(addr2,temp); cycles+=cyccount;
					break;
					case 0x59: /*EOR absolute,y*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					addr2=addr+y;
					if ((addr^addr2)&0xFF00)
					{
							memory.readmem((addr2&0xFF)|(addr&0xFF00)); cycles+=cyccount;
					}
					doints();
					a^=memory.readmem(addr2);
					setzn(a);
					cycles+=cyccount;
					break;
					case 0x5D: /*EOR absolute,x*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					addr2=addr+x;
					if ((addr^addr2)&0xFF00)
					{
							memory.readmem((addr2&0xFF)|(addr&0xFF00)); cycles+=cyccount;
					}
					doints();
					a^=memory.readmem(addr2);
					setzn(a);
					cycles+=cyccount;
					break;
					case 0x5E: /*LSR absolute,x*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount; addr2=addr+x;
					memory.readmem((addr&0xFF00)|(addr2&0xFF)); cycles+=cyccount;
					temp=memory.readmem(addr2);  cycles+=cyccount;
					memory.writemem(addr2,temp); cycles+=cyccount;
					p.c=temp&1;
					temp>>=1;
					setzn(temp);
					doints();
					memory.writemem(addr2,temp); cycles+=cyccount;
					break;
					case 0x79: /*ADC abs,y*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					addr2=addr+y;
					if ((addr^addr2)&0xFF00)
					{
							memory.readmem((addr2&0xFF)|(addr&0xFF00)); cycles+=cyccount;
					}
					doints();
					temp=memory.readmem(addr2); cycles+=cyccount;
					tempc=(p.c)?1:0;
					ADC(temp);
					break;
					case 0x7D: /*ADC abs,x*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					addr2=addr+x;
					if ((addr^addr2)&0xFF00)
					{
							memory.readmem((addr2&0xFF)|(addr&0xFF00)); cycles+=cyccount;
					}
					doints();
					temp=memory.readmem(addr2); cycles+=cyccount;
					tempc=(p.c)?1:0;
					ADC(temp);
					break;
					case 0x7E: /*ROR absolute,x*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount; addr2=addr+x;
					memory.readmem((addr&0xFF00)|(addr2&0xFF)); cycles+=cyccount;
					temp=memory.readmem(addr2);  cycles+=cyccount;
					memory.writemem(addr2,temp); cycles+=cyccount;
					tempc=(p.c)?0x80:0;
					p.c=temp&1;
					temp>>=1;
					temp|=tempc;
					setzn(temp);
					doints();
					memory.writemem(addr2,temp); cycles+=cyccount;
					break;
					case 0x99: /*STA absolute,y*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					addr2=addr+y;
					memory.readmem((addr2&0xFF)|(addr&0xFF00)); cycles+=cyccount;
					doints();
					memory.writemem(addr2,a);
					cycles+=cyccount;
					break;
					case 0x9D: /*STA absolute,x*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					addr2=addr+x;
					memory.readmem((addr2&0xFF)|(addr&0xFF00)); cycles+=cyccount;
					doints();
					memory.writemem(addr2,a);
					cycles+=cyccount;
					break;
					case 0xB9: /*LDA absolute,y*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					addr2=addr+y;
					if ((addr^addr2)&0xFF00)
					{
							memory.readmem((addr2&0xFF)|(addr&0xFF00)); cycles+=cyccount;
					}
					doints();
					a=memory.readmem(addr2);
					setzn(a);
					cycles+=cyccount;
					break;
					case 0xBC: /*LDY absolute,x*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					addr2=addr+x;
					if ((addr^addr2)&0xFF00)
					{
							memory.readmem((addr2&0xFF)|(addr&0xFF00)); cycles+=cyccount;
					}
					doints();
					y=memory.readmem(addr2);
					setzn(y);
					cycles+=cyccount;
					break;
					case 0xBD: /*LDA absolute,x*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					addr2=addr+x;
					if ((addr^addr2)&0xFF00)
					{
							memory.readmem((addr2&0xFF)|(addr&0xFF00)); cycles+=cyccount;
					}
					doints();
					a=memory.readmem(addr2);
					setzn(a);
					cycles+=cyccount;
					break;
					case 0xBE: /*LDX absolute,y*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					addr2=addr+y;
					if ((addr^addr2)&0xFF00)
					{
							memory.readmem((addr2&0xFF)|(addr&0xFF00)); cycles+=cyccount;
					}
					doints();
					x=memory.readmem(addr2);
					setzn(x);
					cycles+=cyccount;
					break;
					case 0xD9: /*CMP absolute,y*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					addr2=addr+y;
					if ((addr^addr2)&0xFF00)
					{
							memory.readmem((addr2&0xFF)|(addr&0xFF00)); cycles+=cyccount;
					}
					doints();
					temp=memory.readmem(addr2);
					setzn(a-temp);
					p.c=(a>=temp);
					cycles+=cyccount;
					break;
					case 0xDD: /*CMP absolute,x*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					addr2=addr+x;
					if ((addr^addr2)&0xFF00)
					{
							memory.readmem((addr2&0xFF)|(addr&0xFF00)); cycles+=cyccount;
					}
					doints();
					temp=memory.readmem(addr2);
					setzn(a-temp);
					p.c=(a>=temp);
					cycles+=cyccount;
					break;
					case 0xDE: /*DEC absolute,x*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount; addr2=addr+x;
					temp=memory.readmem((addr2&0xFF)|(addr&0xFF00)); cycles+=cyccount;
					temp=memory.readmem(addr2); cycles+=cyccount;
					memory.writemem(addr2,temp); temp=(temp-1)&0xff; setzn(temp); cycles+=cyccount;
					doints();
					memory.writemem(addr2,temp); cycles+=cyccount;
					break;
					case 0xF9: /*SBC absolute,y*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					addr2=addr+y;
					if ((addr^addr2)&0xFF00)
					{
							memory.readmem((addr2&0xFF)|(addr&0xFF00)); cycles+=cyccount;
					}
					doints();
					temp=memory.readmem(addr2);
					tempc=(p.c)?0:1;
					SBC(temp);
					cycles+=cyccount;
					break;
					case 0xFD: /*SBC abs,x*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					addr2=addr+x;
					if ((addr^addr2)&0xFF00)
					{
							memory.readmem((addr2&0xFF)|(addr&0xFF00)); cycles+=cyccount;
					}
					doints();
					temp=memory.readmem(addr2); cycles+=cyccount;
					SBC(temp);
					break;
					case 0xFE: /*INC absolute,x*/
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount; addr2=addr+x;
					temp=memory.readmem((addr2&0xFF)|(addr&0xFF00)); cycles+=cyccount;
					temp=memory.readmem(addr2); cycles+=cyccount;
					memory.writemem(addr2,temp); temp=(temp+1)&0xff; setzn(temp); cycles+=cyccount;
					doints();
					memory.writemem(addr2,temp); cycles+=cyccount;
					break;
					case 0x1C: case 0x3C: case 0x5C: case 0x7C: /*NOP absolute,x*/
					case 0xDC: case 0xFC:
					addr=memory.readmem(pc);       pc++; cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
					addr2=addr+x;
					if ((addr^addr2)&0xFF00)
					{
							memory.readmem((addr2&0xFF)|(addr&0xFF00)); cycles+=cyccount;
					}
					doints();
					memory.readmem(addr2);
					cycles+=cyccount;
					break;


					case 0x01: /*ORA (,x)*/
					addr=memory.readmem(pc); pc++;      cycles+=cyccount;
					memory.readmem(addr);               cycles+=cyccount; addr=(addr+x)&0xFF;
					addr2=memory.readmem(addr);         cycles+=cyccount;
					addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
					doints();
					a|=memory.readmem(addr2); setzn(a); cycles+=cyccount;
					break;
					case 0x21: /*AND (,x)*/
					addr=memory.readmem(pc); pc++;      cycles+=cyccount;
					memory.readmem(addr);               cycles+=cyccount; addr=(addr+x)&0xFF;
					addr2=memory.readmem(addr);         cycles+=cyccount;
					addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
					doints();
					a&=memory.readmem(addr2); setzn(a); cycles+=cyccount;
					break;
					case 0x41: /*EOR (,x)*/
					addr=memory.readmem(pc); pc++;      cycles+=cyccount;
					memory.readmem(addr);               cycles+=cyccount; addr=(addr+x)&0xFF;
					addr2=memory.readmem(addr);         cycles+=cyccount;
					addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
					doints();
					a^=memory.readmem(addr2); setzn(a); cycles+=cyccount;
					break;
					case 0x61: /*ADC (,x)*/
					addr=memory.readmem(pc); pc++;      cycles+=cyccount;
					memory.readmem(addr);               cycles+=cyccount; addr=(addr+x)&0xFF;
					addr2=memory.readmem(addr);         cycles+=cyccount;
					addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
					doints();
					temp=memory.readmem(addr2);
					tempc=(p.c)?1:0;
					ADC(temp);
					break;
					case 0x81: /*STA (,x)*/
					addr=memory.readmem(pc); pc++;      cycles+=cyccount;
					memory.readmem(addr);               cycles+=cyccount; addr=(addr+x)&0xFF;
					addr2=memory.readmem(addr);         cycles+=cyccount;
					addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
					doints();
					memory.writemem(addr2,a); cycles+=cyccount;
					break;
					case 0x83: /*SAX (,x)*/
					addr=memory.readmem(pc); pc++;      cycles+=cyccount;
					memory.readmem(addr);               cycles+=cyccount; addr=(addr+x)&0xFF;
					addr2=memory.readmem(addr);         cycles+=cyccount;
					addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
					doints();
					memory.writemem(addr2,a&x); cycles+=cyccount;
					break;
					case 0xA1: /*LDA (,x)*/
					addr=memory.readmem(pc); pc++;      cycles+=cyccount;
					memory.readmem(addr);               cycles+=cyccount; addr=(addr+x)&0xFF;
					addr2=memory.readmem(addr);         cycles+=cyccount;
					addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
					doints();
					a=memory.readmem(addr2); setzn(a); cycles+=cyccount;
					break;
					case 0xC1: /*CMP (,x)*/
					addr=memory.readmem(pc); pc++;      cycles+=cyccount;
					memory.readmem(addr);               cycles+=cyccount; addr=(addr+x)&0xFF;
					addr2=memory.readmem(addr);         cycles+=cyccount;
					addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
					doints();
					temp=memory.readmem(addr2); setzn(a-temp); p.c=(a>=temp); cycles+=cyccount;
					break;
					case 0xE1: /*SBC (,x)*/
					addr=memory.readmem(pc); pc++;      cycles+=cyccount;
					memory.readmem(addr);               cycles+=cyccount; addr=(addr+x)&0xFF;
					addr2=memory.readmem(addr);         cycles+=cyccount;
					addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
					doints();
					temp=memory.readmem(addr2);
					tempc=(p.c)?0:1;
					SBC(temp);
					cycles+=cyccount;
					break;

					case 0x11: /*ORA (),y*/
					addr=memory.readmem(pc); pc++;      cycles+=cyccount;
					addr2=memory.readmem(addr);         cycles+=cyccount;
					addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
					if ((addr2^(addr2+y))&0xFF00) { memory.readmem((addr2&0xFF00)+((addr2+y)&0xFF)); cycles+=cyccount; }
					doints();
					a|=memory.readmem(addr2+y); setzn(a); cycles+=cyccount;
					break;
					case 0x31: /*AND (),y*/
					addr=memory.readmem(pc); pc++;      cycles+=cyccount;
					addr2=memory.readmem(addr);         cycles+=cyccount;
					addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
					if ((addr2^(addr2+y))&0xFF00) { memory.readmem((addr2&0xFF00)+((addr2+y)&0xFF)); cycles+=cyccount; }
					doints();
					a&=memory.readmem(addr2+y); setzn(a); cycles+=cyccount;
					break;
					case 0x51: /*EOR (),y*/
					addr=memory.readmem(pc); pc++;      cycles+=cyccount;
					addr2=memory.readmem(addr);         cycles+=cyccount;
					addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
					if ((addr2^(addr2+y))&0xFF00) { memory.readmem((addr2&0xFF00)+((addr2+y)&0xFF)); cycles+=cyccount; }
					doints();
					a^=memory.readmem(addr2+y); setzn(a); cycles+=cyccount;
					break;
					case 0x71: /*ADC (),y*/
					addr=memory.readmem(pc); pc++;      cycles+=cyccount;
					addr2=memory.readmem(addr);         cycles+=cyccount;
					addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
					if ((addr2^(addr2+y))&0xFF00) { memory.readmem((addr2&0xFF00)+((addr2+y)&0xFF)); cycles+=cyccount; }
					doints();
					temp=memory.readmem(addr2+y);
					tempc=(p.c)?1:0;
					ADC(temp);
					break;
					case 0x91: /*STA (),y*/
					addr=memory.readmem(pc); pc++;      cycles+=cyccount;
					addr2=memory.readmem(addr);         cycles+=cyccount;
					addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
					memory.readmem((addr2&0xFF00)+((addr2+y)&0xFF)); cycles+=cyccount;
					doints();
					memory.writemem(addr2+y,a); cycles+=cyccount;
					break;
					case 0xB1: /*LDA (),y*/
					addr=memory.readmem(pc); pc++;      cycles+=cyccount;
					addr2=memory.readmem(addr);         cycles+=cyccount;
					addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
					if ((addr2^(addr2+y))&0xFF00) { memory.readmem((addr2&0xFF00)+((addr2+y)&0xFF)); cycles+=cyccount; }
					doints();
					a=memory.readmem(addr2+y); setzn(a); cycles+=cyccount;
					break;
					case 0xD1: /*CMP (),y*/
					addr=memory.readmem(pc); pc++;      cycles+=cyccount;
					addr2=memory.readmem(addr);         cycles+=cyccount;
					addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
					if ((addr2^(addr2+y))&0xFF00) { memory.readmem((addr2&0xFF00)+((addr2+y)&0xFF)); cycles+=cyccount; }
					doints();
					temp=memory.readmem(addr2+y); cycles+=cyccount;
					setzn(a-temp);
					p.c=(a>=temp);
					break;
					case 0xD3: /*DCP (),y*/
					addr=memory.readmem(pc); pc++;      cycles+=cyccount;
					addr2=memory.readmem(addr);         cycles+=cyccount;
					addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
					if ((addr2^(addr2+y))&0xFF00) { memory.readmem((addr2&0xFF00)+((addr2+y)&0xFF)); cycles+=cyccount; }
					doints();
					temp=memory.readmem(addr2+y); cycles+=cyccount;
					memory.writemem(addr2+y,temp); temp=(temp-1)&0xff; cycles+=cyccount;
					doints();
					memory.writemem(addr2+y,temp); cycles+=cyccount;
					setzn(a-temp);
					p.c=(a>=temp);
					break;
					case 0xF1: /*SBC (),y*/
					addr=memory.readmem(pc); pc++;      cycles+=cyccount;
					addr2=memory.readmem(addr);         cycles+=cyccount;
					addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
					if ((addr2^(addr2+y))&0xFF00) { memory.readmem((addr2&0xFF00)+((addr2+y)&0xFF)); cycles+=cyccount; }
					doints();
					temp=memory.readmem(addr2+y);
					tempc=(p.c)?0:1;
					SBC(temp);
					cycles+=cyccount;
					break;

					case 0x10: /*BPL*/
					doints();
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					if (addr&0x80) addr|=0xFF00;
					if (!p.n)
					{
							doints();
							memory.readmem(pc); cycles+=cyccount;
							addr2=(pc+addr)&0xffff;
							if ((pc^addr2)&0xFF00)
							{
									doints();
									memory.readmem((addr2&0xFF)+(pc&0xFF00)); cycles+=cyccount;
							}
							pc=addr2;

					}
					break;
					case 0x30: /*BMI*/
					doints();
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					if (addr&0x80) addr|=0xFF00;
					if (p.n)
					{
							doints();
							memory.readmem(pc); cycles+=cyccount;
							addr2=(pc+addr)&0xffff;
							if ((pc^addr2)&0xFF00)
							{
									doints();
									memory.readmem((addr2&0xFF)+(pc&0xFF00)); cycles+=cyccount;
							}
							pc=addr2;

					}
					break;
					case 0x50: /*BVC*/
					doints();
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					if (addr&0x80) addr|=0xFF00;
					if (!p.v)
					{
							doints();
							memory.readmem(pc); cycles+=cyccount;
							addr2=(pc+addr)&0xffff;
							if ((pc^addr2)&0xFF00)
							{
									doints();
									memory.readmem((addr2&0xFF)+(pc&0xFF00)); cycles+=cyccount;
							}
							pc=addr2;

					}
					break;
					case 0x70: /*BVS*/
					doints();
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					if (addr&0x80) addr|=0xFF00;
					if (p.v)
					{
							doints();
							memory.readmem(pc); cycles+=cyccount;
							addr2=(pc+addr)&0xffff;
							if ((pc^addr2)&0xFF00)
							{
									doints();
									memory.readmem((addr2&0xFF)+(pc&0xFF00)); cycles+=cyccount;
							}
							pc=addr2;

					}
					break;
					case 0x90: /*BCC*/
					doints();
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					if (addr&0x80) addr|=0xFF00;
					if (!p.c)
					{
							doints();
							memory.readmem(pc); cycles+=cyccount;
							addr2=(pc+addr)&0xffff;
							if ((pc^addr2)&0xFF00)
							{
									doints();
									memory.readmem((addr2&0xFF)+(pc&0xFF00)); cycles+=cyccount;
							}
							pc=addr2;

					}
					break;
					case 0xB0: /*BCS*/
					doints();
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					if (addr&0x80) addr|=0xFF00;
					if (p.c)
					{
							doints();
							memory.readmem(pc); cycles+=cyccount;
							addr2=(pc+addr)&0xffff;
							if ((pc^addr2)&0xFF00)
							{
									doints();
									memory.readmem((addr2&0xFF)+(pc&0xFF00)); cycles+=cyccount;
							}
							pc=addr2;

					}
					break;
					case 0xD0: /*BNE*/
					doints();
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					if (addr&0x80) addr|=0xFF00;
					if (!p.z)
					{
							doints();
							memory.readmem(pc); cycles+=cyccount;
							addr2=(pc+addr)&0xffff;
							if ((pc^addr2)&0xFF00)
							{
									doints();
									memory.readmem((addr2&0xFF)+(pc&0xFF00)); cycles+=cyccount;
							}
							pc=addr2;

					}
					break;
					case 0xF0: /*BEQ*/
					doints();
					addr=memory.readmem(pc); pc++; cycles+=cyccount;
					if (addr&0x80) addr|=0xFF00;
					if (p.z)
					{
							doints();
							memory.readmem(pc); cycles+=cyccount;
							addr2=(pc+addr)&0xffff;
							if ((pc^addr2)&0xFF00)
							{
									doints();
									memory.readmem((addr2&0xFF)+(pc&0xFF00)); cycles+=cyccount;
							}
							pc=addr2;

					}
					break;

					case 0x20: /*JSR*/
					addr=memory.readmem(pc); pc++;         cycles+=cyccount;
					memory.readmem(0x100+s);               cycles+=cyccount;
					memory.writemem(0x100+s,pc>>8);   s--; cycles+=cyccount;
					memory.writemem(0x100+s,pc&0xFF); s--; cycles+=cyccount;
					doints();
					pc=addr|(memory.readmem(pc)<<8);       cycles+=cyccount;
					break;
					case 0x40: /*RTI*/
					memory.readmem(pc);                    cycles+=cyccount;
					memory.readmem(0x100+s);          s++; cycles+=cyccount;
					temp=memory.readmem(0x100+s);     s++; cycles+=cyccount;
					pc=memory.readmem(0x100+s);       s++; cycles+=cyccount;
					doints();
					pc|=(memory.readmem(0x100+s)<<8);      cycles+=cyccount;
					p.c=temp&1; p.z=temp&2; p.i=temp&4; p.d=temp&8;
					p.v=temp&0x40; p.n=temp&0x80;
					break;
					case 0x4C: /*JMP*/
					addr=memory.readmem(pc);         pc++; cycles+=cyccount;
					doints();
					pc=addr|(memory.readmem(pc)<<8);       cycles+=cyccount;
					break;
					case 0x60: /*RTS*/
					memory.readmem(pc);                    cycles+=cyccount;
					memory.readmem(0x100+s); s++;          cycles+=cyccount;
					pc=memory.readmem(0x100+s); s++;       cycles+=cyccount;
					pc|=(memory.readmem(0x100+s)<<8);      cycles+=cyccount;
					doints();
					memory.readmem(pc); pc++;              cycles+=cyccount;
					break;
					case 0x6C: /*JMP ()*/
					addr=memory.readmem(pc); pc++;                        cycles+=cyccount;
					addr|=(memory.readmem(pc)<<8);                        cycles+=cyccount;
					pc=memory.readmem(addr);                              cycles+=cyccount;
					doints();
					pc|=memory.readmem((addr&0xFF00)|((addr+1)&0xFF))<<8; cycles+=cyccount;
					break;

					default:
					switch (opcode&0xF)
					{
							case 0xA:
							break;
							case 0x0:
							case 0x2:
							case 0x3:
							case 0x4:
							case 0x7:
							case 0x9:
							case 0xB:
							pc++;
							break;
							case 0xC:
							case 0xE:
							case 0xF:
							pc+=2;
							cycles+=(cyccount*2);
							break;
					}
					cycles+=(cyccount*2);
					doints();
					break;
/*                        pc--;
					dumpregs();
					rpclog("Bad 6502 opcode %02X %04X %04X %i %i\n",opcode,oldpc,oldpc2,extrom,rombank);
					fflush(stdout);
					exit(-1);*/
			}
			
			if (realnmi)
				{
                        realnmi=0;
                        temp =(p.c)?1:0;    temp|=(p.z)?2:0;
                        temp|=(p.i)?4:0;    temp|=(p.d)?8:0;
                        temp|=(p.v)?0x40:0; temp|=(p.n)?0x80:0;
                        temp|=0x30;
                        memory.writemem(0x100+s,pc>>8);   s--; cycles+=cyccount;
                        memory.writemem(0x100+s,pc&0xFF); s--; cycles+=cyccount;
                        memory.writemem(0x100+s,temp);    s--; cycles+=cyccount;
                        pc=memory.readmem(0xFFFA);             cycles+=cyccount;
                        pc|=(memory.readmem(0xFFFB)<<8);       cycles+=cyccount;
                        p.i=1;
                        cycles+=cyccount; cycles+=cyccount;
                        //yield();
//                        printf("Taking NMI!\n");
                }
                else if (realirq && !p.i)
                {
                        temp =(p.c)?1:0;    temp|=(p.z)?2:0;
                        temp|=(p.i)?4:0;    temp|=(p.d)?8:0;
                        temp|=(p.v)?0x40:0; temp|=(p.n)?0x80:0;
                        temp|=0x20;
                        memory.writemem(0x100+s,pc>>8);   s--; cycles+=cyccount;
                        memory.writemem(0x100+s,pc&0xFF); s--; cycles+=cyccount;
                        memory.writemem(0x100+s,temp);    s--; cycles+=cyccount;
                        pc=memory.readmem(0xFFFE);             cycles+=cyccount;
                        pc|=(memory.readmem(0xFFFF)<<8);       cycles+=cyccount;
                        p.i=1;
                        cycles+=cyccount; cycles+=cyccount;
                        //yield();
//                        printf("Taking int!\n");
                }
                ins++;
                oldcycs=cycles-oldcycs;
                if (cpureset)
                {
                        cpureset=0;
                        reset6502();
                }						
			
		}
		cycles-=128;
		ulacycles-=128;
	}
	
	
	self.reset6502 = function() {
        a=x=y=s=0;
        pc=memory.readmem16(0xFFFC);
        p.c=p.z=p.d=p.v=p.n=0;
        p.i=1;
        cycles=0;
        //mrbmapped=0;
	}
	
	self. reset6502e = function() {
        cpureset=1;
	}

	self.runCode = function() {
		self.exec6502();
	}
	
	self.loadSnapshot = function(procbuffer, offset) {
		a = procbuffer[offset+0];
		p.c = procbuffer[offset+1] & 1;
		p.z = procbuffer[offset+1] & 2;
		p.i = procbuffer[offset+1] & 4;
		p.d = procbuffer[offset+1] & 8;
		//p.b = 
		p.v = procbuffer[offset+1] & 64;
		p.n = procbuffer[offset+1] & 128;
		x = procbuffer[offset+2];
		y = procbuffer[offset+3];
		s = procbuffer[offset+4];
		pc = procbuffer[offset+5]+(procbuffer[offset+6]<<8);
	}

	self.waitforramsync = function() {
        //int temp;
        if (!(sheila.screenMode&4) && display.displayOn && cycles>24 && cycles<96)
        {
           cycles = 96;
        }
        if (cycles&1) cycles++;
		cycles++;
	}
	
	return self;
	
}