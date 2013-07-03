// 6502 cpu emulator code for ElkJs
// adapted by Darren Coles from:

//Elkulator v1.0 by Tom Walker
//  6502 emulation

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
	
	var addr;
	var addr2;
	var temp;
	var tempc;
	var oldcycs;
	
	var opcode;

	var opcodeTables = new Array();
	
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
	

	function brk() {
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
	}

	function php() {
		temp =(p.c)?1:0;    temp|=(p.z)?2:0;
		temp|=(p.i)?4:0;    temp|=(p.d)?8:0;
		temp|=(p.v)?0x40:0; temp|=(p.n)?0x80:0;
		temp|=0x30;
		memory.readmem(pc);    cycles+=cyccount;
		doints();
		memory.writemem(0x100+s,temp); s--; cycles+=cyccount;
	//  printf("It's the PHP\n");
	}

	function asl_a() {
		doints();
		memory.readmem(pc); cycles+=cyccount;
		p.c=a&0x80;
		a=(a<<1)&0xff;
		setzn(a);
	}

	function clc() {
		doints();
		memory.readmem(pc);
		p.c=0;
		cycles+=cyccount;	
	}

	function plp() {
		memory.readmem(pc);           cycles+=cyccount;
		memory.readmem(0x100+s); s++; cycles+=cyccount;
		doints();
		temp=memory.readmem(0x100+s);    cycles+=cyccount;
		p.c=temp&1; p.z=temp&2; p.i=temp&4; p.d=temp&8;
		p.v=temp&0x40; p.n=temp&0x80;
		}

	function rol_a() {
		doints();
		memory.readmem(pc);
		tempc=(p.c)?1:0;
		p.c=a&0x80;
		a=(a<<1)&0xff;
		a|=tempc;
		setzn(a);
		cycles+=cyccount;
	}

	function sec() {
		doints();
		memory.readmem(pc);
		p.c=1;
		cycles+=cyccount;
	}

	function pha() {
		memory.readmem(pc);    cycles+=cyccount;
		doints();
		memory.writemem(0x100+s,a); s--; cycles+=cyccount;		
	}

	function lsr_a() {
		doints();
		memory.readmem(pc); cycles+=cyccount;
		p.c=a&1;
		a>>=1;
		setzn(a);
	}

	function cli() {
		doints();
		memory.readmem(pc);
		p.i=0;
		cycles+=cyccount;				
	}

	function pla() {
		memory.readmem(pc);           cycles+=cyccount;
		memory.readmem(0x100+s); s++; cycles+=cyccount;
		doints();
		a=memory.readmem(0x100+s);    cycles+=cyccount;
		setzn(a);
	}

	function ror_a() {
		doints();
		memory.readmem(pc);
		tempc=(p.c)?0x80:0;
		p.c=a&1;
		a>>=1;
		a|=tempc;
		setzn(a);
		cycles+=cyccount;
	}

	function sei() {
		doints();
		memory.readmem(pc);
		p.i=1;
		cycles+=cyccount;
						
	}

	function dey() {
		doints();
		memory.readmem(pc);
		y=(y-1)&0xff;
		setzn(y);
		cycles+=cyccount;				
	}

	function txa() {
		doints();
		memory.readmem(pc);
		a=x;
		setzn(a);
		cycles+=cyccount;
	}

	function tya() {
		doints();
		memory.readmem(pc);
		a=y;
		setzn(a);
		cycles+=cyccount;
	}

	function txs() {
		doints();
		memory.readmem(pc);
		s=x;
		cycles+=cyccount;
	}

	function tay() {
		doints();
		memory.readmem(pc);
		y=a;
		setzn(y);
		cycles+=cyccount;			
	}

	function tax() {
		doints();
		memory.readmem(pc);
		x=a;
		setzn(x);
		cycles+=cyccount;
	}

	function clv() {
		doints();
		memory.readmem(pc);
		p.v=0;
		cycles+=cyccount;				
	}

	function tsx() {
		doints();
		memory.readmem(pc);
		x=s;
		setzn(x);
		cycles+=cyccount;
	}

	function iny() {
		doints();
		memory.readmem(pc);
		y=(y+1)&0xff;
		setzn(y);
		cycles+=cyccount;
	}

	function dex() {
		doints();
		memory.readmem(pc);
		x=(x-1)&0xff;
		setzn(x);
		cycles+=cyccount;
	}

	function cld() {
		doints();
		memory.readmem(pc);
		p.d=0;
		cycles+=cyccount;
	}

	function inx() {
		doints();
		memory.readmem(pc);
		x=(x+1)&0xff;
		setzn(x);
		cycles+=cyccount;
	}

	function nop() {
		doints();
		memory.readmem(pc);
		cycles+=cyccount;
	}

	function sed() {
		doints();
		memory.readmem(pc);
		p.d=1;
		cycles+=cyccount;
	}

	function ora_imm() {
		doints();
		temp=memory.readmem(pc); pc++; cycles+=cyccount;
		a|=temp; setzn(a);
	}

	function and_imm() {
		doints();
		temp=memory.readmem(pc); pc++; cycles+=cyccount;
		a&=temp; setzn(a);
	}

	function eor_imm() {
		doints();
		temp=memory.readmem(pc); pc++; cycles+=cyccount;
		a^=temp; setzn(a);
	}

	function adc_imm() {
		doints();
		tempc=(p.c)?1:0;
		temp=memory.readmem(pc); pc++; cycles+=cyccount;
		ADC(temp);
	}

	function nop_imm() {
		doints();
		memory.readmem(pc); pc++; cycles+=cyccount;
	}

	function ldy_imm() {
		doints();
		y=memory.readmem(pc); pc++; cycles+=cyccount;
		setzn(y);
	}

	function ldx_imm() {
		doints();
		x=memory.readmem(pc); pc++; cycles+=cyccount;
		setzn(x);
	}

	function lda_imm() {
		doints();
		a=memory.readmem(pc); pc++; cycles+=cyccount;
		setzn(a);
	}

	function cpy_imm() {
		doints();
		temp=memory.readmem(pc); pc++; cycles+=cyccount;
		setzn(y-temp);
		p.c=(y>=temp);
	}

	function cmp_imm() {
		doints();
		temp=memory.readmem(pc); pc++; cycles+=cyccount;
		setzn(a-temp);
		p.c=(a>=temp);
	}

	function cpx_imm() {
		doints();
		temp=memory.readmem(pc); pc++; cycles+=cyccount;
		setzn(x-temp);
		p.c=(x>=temp);
	}

	function sbc_imm() {
		doints();
		tempc=(p.c)?0:1;
		temp=memory.readmem(pc); pc++; cycles+=cyccount;
		SBC(temp);
	}

	function nop_zp() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		doints();
		memory.readmem(addr);
		cycles+=cyccount;
	}

	function ora_zp() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		doints();
		temp=memory.readmem(addr); cycles+=cyccount;
		a|=temp;
		setzn(a);
	}

	function asl_zp() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		temp=memory.readmem(addr); cycles+=cyccount;
		memory.writemem(addr,temp); p.c=temp&0x80; temp=(temp<<1)&0xff; setzn(temp); cycles+=cyccount;
		doints();
		memory.writemem(addr,temp); cycles+=cyccount;
	}

	function bit_zp() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		doints();
		temp=memory.readmem(addr);
		p.z=!(temp&a);
		p.v=temp&0x40;
		p.n=temp&0x80;
		cycles+=cyccount;
	}

	function and_zp() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		doints();
		temp=memory.readmem(addr); cycles+=cyccount;
		a&=temp;
		setzn(a);
	}

	function rol_zp() {
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
	}

	function eor_zp() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		doints();
		temp=memory.readmem(addr); cycles+=cyccount;
		a^=temp;
		setzn(a);
	}

	function lsr_zp() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		temp=memory.readmem(addr); cycles+=cyccount;
		memory.writemem(addr,temp); p.c=temp&1; temp>>=1; setzn(temp); cycles+=cyccount;
		doints();
		memory.writemem(addr,temp); cycles+=cyccount;
	}

	function adc_zp() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		doints();
		temp=memory.readmem(addr); cycles+=cyccount;
		tempc=(p.c)?1:0;
		ADC(temp);
	}

	function ror_zp() {
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
	}

	function sty_zp() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		doints();
		memory.writemem(addr,y);
		cycles+=cyccount;
	}

	function sta_zp() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		doints();
		memory.writemem(addr,a);
		cycles+=cyccount;
	}

	function stx_zp() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		doints();
		memory.writemem(addr,x);
		cycles+=cyccount;
	}

	function ldy_zp() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		doints();
		y=memory.readmem(addr);
		setzn(y);
		cycles+=cyccount;
	}

	function lda_zp() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		doints();
		a=memory.readmem(addr);
		setzn(a);
		cycles+=cyccount;
	}

	function ldx_zp() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		doints();
		x=memory.readmem(addr);
		setzn(x);
		cycles+=cyccount;
	}

	function cpy_zp() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		doints();
		temp=memory.readmem(addr); cycles+=cyccount;
		setzn(y-temp);
		p.c=(y>=temp);
	}

	function cmp_zp() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		doints();
		temp=memory.readmem(addr); cycles+=cyccount;
		setzn(a-temp);
		p.c=(a>=temp);
	}

	function dec_zp() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		temp=memory.readmem(addr); cycles+=cyccount;
		memory.writemem(addr,temp); temp=(temp-1)&0xff; setzn(temp); cycles+=cyccount;
		doints();
		memory.writemem(addr,temp); cycles+=cyccount;
	}

	function cpx_zp() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		doints();
		temp=memory.readmem(addr); cycles+=cyccount;
		setzn(x-temp);
		p.c=(x>=temp);
	}

	function sbc_zp() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		doints();
		temp=memory.readmem(addr); cycles+=cyccount;
		tempc=(p.c)?0:1;
		SBC(temp);
	}

	function inc_zp() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		temp=memory.readmem(addr); cycles+=cyccount;
		memory.writemem(addr,temp); temp=(temp+1)&0xff; setzn(temp); cycles+=cyccount;
		doints();
		memory.writemem(addr,temp); cycles+=cyccount;
	}

	function nop_zp_x() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		memory.readmem(addr); cycles+=cyccount;
		doints();
		memory.readmem((addr+x)&0xFF);
		cycles+=cyccount;
	}

	function ora_zp_x() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		memory.readmem(addr); cycles+=cyccount;
		doints();
		temp=memory.readmem((addr+x)&0xFF); cycles+=cyccount;
		a|=temp;
		setzn(a);
	}

	function asl_zp_x() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		memory.readmem(addr); cycles+=cyccount; addr=(addr+x)&0xFF;
		temp=memory.readmem(addr); cycles+=cyccount;
		memory.writemem(addr,temp); p.c=temp&0x80; temp=(temp<<1)&0xff; setzn(temp); cycles+=cyccount;
		doints();
		memory.writemem(addr,temp); cycles+=cyccount;
	}

	function and_zp_x() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		memory.readmem(addr); cycles+=cyccount;
		doints();
		temp=memory.readmem((addr+x)&0xFF); cycles+=cyccount;
		a&=temp;
		setzn(a);
	}

	function rol_zp_x() {
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
	}

	function eor_zp_x() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		memory.readmem(addr); cycles+=cyccount;
		doints();
		temp=memory.readmem((addr+x)&0xFF); cycles+=cyccount;
		a^=temp;
		setzn(a);
	}

	function lsr_zp_x() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		memory.readmem(addr); cycles+=cyccount; addr=(addr+x)&0xFF;
		temp=memory.readmem(addr); cycles+=cyccount;
		memory.writemem(addr,temp); p.c=temp&1; temp>>=1; setzn(temp); cycles+=cyccount;
		doints();
		memory.writemem(addr,temp); cycles+=cyccount;
	}

	function adc_zp_x() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		memory.readmem(addr); cycles+=cyccount; addr=(addr+x)&0xFF;
		doints();
		temp=memory.readmem(addr); cycles+=cyccount;
		tempc=(p.c)?1:0;
		ADC(temp);
	}

	function ror_zp_x() {
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
	}

	function sty_zp_x() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		memory.readmem(addr); cycles+=cyccount;
		doints();
		memory.writemem((addr+x)&0xFF,y);
		cycles+=cyccount;
	}

	function sta_zp_x() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		memory.readmem(addr); cycles+=cyccount;
		doints();
		memory.writemem((addr+x)&0xFF,a);
		cycles+=cyccount;
	}

	function stx_zp_y() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		memory.readmem(addr); cycles+=cyccount;
		doints();
		memory.writemem((addr+y)&0xFF,x);
		cycles+=cyccount;
	}

	function ldy_zp_x() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		memory.readmem(addr); cycles+=cyccount;
		doints();
		y=memory.readmem((addr+x)&0xFF);
		setzn(y);
		cycles+=cyccount;
	}

	function lda_zp_x() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		memory.readmem(addr); cycles+=cyccount;
		doints();
		a=memory.readmem((addr+x)&0xFF);
		setzn(a);
		cycles+=cyccount;
	}

	function ldx_zp_y() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		memory.readmem(addr); cycles+=cyccount;
		doints();
		x=memory.readmem((addr+y)&0xFF);
		setzn(x);
		cycles+=cyccount;
	}

	function cmp_zp_x() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		memory.readmem(addr); cycles+=cyccount; addr=(addr+x)&0xFF;
		doints();
		temp=memory.readmem(addr); cycles+=cyccount;
		setzn(a-temp);
		p.c=(a>=temp);
	}

	function dec_zp_x() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		memory.readmem(addr); cycles+=cyccount; addr=(addr+x)&0xFF;
		temp=memory.readmem(addr); cycles+=cyccount;
		memory.writemem(addr,temp); temp=(temp-1)&0xff; setzn(temp); cycles+=cyccount;
		doints();
		memory.writemem(addr,temp); cycles+=cyccount;
	}

	function sbc_zp_x() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		memory.readmem(addr); cycles+=cyccount; addr=(addr+x)&0xFF;
		doints();
		temp=memory.readmem(addr); cycles+=cyccount;
		tempc=(p.c)?0:1;
		SBC(temp);
	}

	function inc_zp_x() {
		addr=memory.readmem(pc); pc++; cycles+=cyccount;
		memory.readmem(addr); cycles+=cyccount; addr=(addr+x)&0xFF;
		temp=memory.readmem(addr); cycles+=cyccount;
		memory.writemem(addr,temp); temp=(temp+1)&0xff; setzn(temp); cycles+=cyccount;
		doints();
		memory.writemem(addr,temp); cycles+=cyccount;
	}

	function nop_abs() {
		addr=memory.readmem(pc);       pc++; cycles+=cyccount;
		addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
		doints();
		memory.readmem(addr);
		cycles+=cyccount;
	}

	function ora_abs() {
		addr=memory.readmem(pc);       pc++; cycles+=cyccount;
		addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
		doints();
		a|=memory.readmem(addr);
		setzn(a);
		cycles+=cyccount;
	}

	function asl_abs() {
		addr=memory.readmem(pc);       pc++; cycles+=cyccount;
		addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
		temp=memory.readmem(addr);  cycles+=cyccount;
		memory.writemem(addr,temp); cycles+=cyccount;
		p.c=temp&0x80;
		temp=(temp<<1)&0xff;
		setzn(temp);
		doints();
		memory.writemem(addr,temp); cycles+=cyccount;
	}

	function bit_abs() {
		addr=memory.readmem(pc);       pc++; cycles+=cyccount;
		addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
		doints();
		temp=memory.readmem(addr);
		p.z=!(temp&a);
		p.v=temp&0x40;
		p.n=temp&0x80;
		cycles+=cyccount;
	}

	function and_abs() {
		addr=memory.readmem(pc);       pc++; cycles+=cyccount;
		addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
		doints();
		a&=memory.readmem(addr);
		setzn(a);
		cycles+=cyccount;
	}

	function rol_abs() {
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
	}

	function rla_abs() {
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
	}

	function eor_abs() {
		addr=memory.readmem(pc);       pc++; cycles+=cyccount;
		addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
		doints();
		a^=memory.readmem(addr);
		setzn(a);
		cycles+=cyccount;
	}

	function lsr_abs() {
		addr=memory.readmem(pc);       pc++; cycles+=cyccount;
		addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
		temp=memory.readmem(addr);  cycles+=cyccount;
		memory.writemem(addr,temp); cycles+=cyccount;
		p.c=temp&1;
		temp>>=1;
		setzn(temp);
		doints();
		memory.writemem(addr,temp); cycles+=cyccount;
	}

	function adc_abs() {
		addr=memory.readmem(pc);       pc++; cycles+=cyccount;
		addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
		doints();
		temp=memory.readmem(addr); cycles+=cyccount;
		tempc=(p.c)?1:0;
		ADC(temp);
	}

	function ror_abs() {
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
	}

	function sty_abs() {
		addr=memory.readmem(pc);       pc++; cycles+=cyccount;
		addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
		doints();
		memory.writemem(addr,y);
		cycles+=cyccount;
	}

	function sta_abs() {
		addr=memory.readmem(pc);       pc++; cycles+=cyccount;
		addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
		doints();
		memory.writemem(addr,a);
		cycles+=cyccount;
	}

	function stx_abs() {
		addr=memory.readmem(pc);       pc++; cycles+=cyccount;
		addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
		doints();
		memory.writemem(addr,x);
		cycles+=cyccount;
	}

	function ldy_abs() {
		addr=memory.readmem(pc);       pc++; cycles+=cyccount;
		addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
		doints();
		y=memory.readmem(addr);
		setzn(y);
		cycles+=cyccount;
	}

	function lda_abs() {
		addr=memory.readmem(pc);       pc++; cycles+=cyccount;
		addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
		doints();
		a=memory.readmem(addr);
		setzn(a);
		cycles+=cyccount;
	}

	function ldx_abs() {
		addr=memory.readmem(pc);       pc++; cycles+=cyccount;
		addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
		doints();
		x=memory.readmem(addr);
		setzn(x);
		cycles+=cyccount;
	}

	function cpy_abs() {
		addr=memory.readmem(pc);       pc++; cycles+=cyccount;
		addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
		doints();
		temp=memory.readmem(addr);
		setzn(y-temp);
		p.c=(y>=temp);
		cycles+=cyccount;
	}

	function cmp_abs() {
		addr=memory.readmem(pc);       pc++; cycles+=cyccount;
		addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
		doints();
		temp=memory.readmem(addr);
		setzn(a-temp);
		p.c=(a>=temp);
		cycles+=cyccount;
	}

	function dec_abs() {
		addr=memory.readmem(pc);       pc++; cycles+=cyccount;
		addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
		temp=memory.readmem(addr); cycles+=cyccount;
		memory.writemem(addr,temp); temp=(temp-1)&0xff; setzn(temp); cycles+=cyccount;
		doints();
		memory.writemem(addr,temp); cycles+=cyccount;
	}

	function cpx_abs() {
		addr=memory.readmem(pc);       pc++; cycles+=cyccount;
		addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
		doints();
		temp=memory.readmem(addr);
		setzn(x-temp);
		p.c=(x>=temp);
		cycles+=cyccount;
	}

	function sbc_abs() {
		addr=memory.readmem(pc);       pc++; cycles+=cyccount;
		addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
		doints();
		temp=memory.readmem(addr); cycles+=cyccount;
		tempc=(p.c)?0:1;
		SBC(temp);
	}

	function inc_abs() {
		addr=memory.readmem(pc);       pc++; cycles+=cyccount;
		addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
		temp=memory.readmem(addr); cycles+=cyccount;
		memory.writemem(addr,temp); temp=(temp+1)&0xff; setzn(temp); cycles+=cyccount;
		doints();
		memory.writemem(addr,temp); cycles+=cyccount;
	}

	function ora_abs_y() {
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
	}

	function ora_abs_x() {
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
	}

	function asl_abs_x() {
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
	}

	function and_abs_y() {
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
	}

	function and_abs_x() {
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
	}

	function rol_abs_x() {
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
	}

	function eor_abs_y() {
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
	}

	function eor_abs_x() {
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
	}

	function lsr_abs_x() {
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
	}

	function adc_abs_y() {
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
	}

	function adc_abs_x() {
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
	}

	function ror_abs_x() {
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
	}

	function sta_abs_y() {
		addr=memory.readmem(pc);       pc++; cycles+=cyccount;
		addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
		addr2=addr+y;
		memory.readmem((addr2&0xFF)|(addr&0xFF00)); cycles+=cyccount;
		doints();
		memory.writemem(addr2,a);
		cycles+=cyccount;
	}

	function sta_abs_x() {
		addr=memory.readmem(pc);       pc++; cycles+=cyccount;
		addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount;
		addr2=addr+x;
		memory.readmem((addr2&0xFF)|(addr&0xFF00)); cycles+=cyccount;
		doints();
		memory.writemem(addr2,a);
		cycles+=cyccount;
	}

	function lda_abs_y() {
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
	}

	function ldy_abs_x() {
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
	}

	function lda_abs_x() {
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
	}

	function ldx_abs_y() {
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
	}

	function cmp_abs_y() {
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
	}

	function cmp_abs_x() {
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
	}

	function dec_abs_x() {
		addr=memory.readmem(pc);       pc++; cycles+=cyccount;
		addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount; addr2=addr+x;
		temp=memory.readmem((addr2&0xFF)|(addr&0xFF00)); cycles+=cyccount;
		temp=memory.readmem(addr2); cycles+=cyccount;
		memory.writemem(addr2,temp); temp=(temp-1)&0xff; setzn(temp); cycles+=cyccount;
		doints();
		memory.writemem(addr2,temp); cycles+=cyccount;
	}

	function sbc_abs_y() {
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
	}

	function sbc_abs_x() {
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
	}

	function inc_abs_x() {
		addr=memory.readmem(pc);       pc++; cycles+=cyccount;
		addr|=(memory.readmem(pc)<<8); pc++; cycles+=cyccount; addr2=addr+x;
		temp=memory.readmem((addr2&0xFF)|(addr&0xFF00)); cycles+=cyccount;
		temp=memory.readmem(addr2); cycles+=cyccount;
		memory.writemem(addr2,temp); temp=(temp+1)&0xff; setzn(temp); cycles+=cyccount;
		doints();
		memory.writemem(addr2,temp); cycles+=cyccount;
	}

	function nop_abs_x() {
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
	}

	function ora_ind_x() {
		addr=memory.readmem(pc); pc++;      cycles+=cyccount;
		memory.readmem(addr);               cycles+=cyccount; addr=(addr+x)&0xFF;
		addr2=memory.readmem(addr);         cycles+=cyccount;
		addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
		doints();
		a|=memory.readmem(addr2); setzn(a); cycles+=cyccount;
	}

	function and_ind_x() {
		addr=memory.readmem(pc); pc++;      cycles+=cyccount;
		memory.readmem(addr);               cycles+=cyccount; addr=(addr+x)&0xFF;
		addr2=memory.readmem(addr);         cycles+=cyccount;
		addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
		doints();
		a&=memory.readmem(addr2); setzn(a); cycles+=cyccount;
	}

	function eor_ind_x() {
		addr=memory.readmem(pc); pc++;      cycles+=cyccount;
		memory.readmem(addr);               cycles+=cyccount; addr=(addr+x)&0xFF;
		addr2=memory.readmem(addr);         cycles+=cyccount;
		addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
		doints();
		a^=memory.readmem(addr2); setzn(a); cycles+=cyccount;
	}

	function adc_ind_x() {
		addr=memory.readmem(pc); pc++;      cycles+=cyccount;
		memory.readmem(addr);               cycles+=cyccount; addr=(addr+x)&0xFF;
		addr2=memory.readmem(addr);         cycles+=cyccount;
		addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
		doints();
		temp=memory.readmem(addr2);
		tempc=(p.c)?1:0;
		ADC(temp);
	}

	function sta_ind_x() {
		addr=memory.readmem(pc); pc++;      cycles+=cyccount;
		memory.readmem(addr);               cycles+=cyccount; addr=(addr+x)&0xFF;
		addr2=memory.readmem(addr);         cycles+=cyccount;
		addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
		doints();
		memory.writemem(addr2,a); cycles+=cyccount;
	}

	function sax_ind_x() {
		addr=memory.readmem(pc); pc++;      cycles+=cyccount;
		memory.readmem(addr);               cycles+=cyccount; addr=(addr+x)&0xFF;
		addr2=memory.readmem(addr);         cycles+=cyccount;
		addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
		doints();
		memory.writemem(addr2,a&x); cycles+=cyccount;
	}

	function lda_ind_x() {
		addr=memory.readmem(pc); pc++;      cycles+=cyccount;
		memory.readmem(addr);               cycles+=cyccount; addr=(addr+x)&0xFF;
		addr2=memory.readmem(addr);         cycles+=cyccount;
		addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
		doints();
		a=memory.readmem(addr2); setzn(a); cycles+=cyccount;
	}

	function cmp_ind_x() {
		addr=memory.readmem(pc); pc++;      cycles+=cyccount;
		memory.readmem(addr);               cycles+=cyccount; addr=(addr+x)&0xFF;
		addr2=memory.readmem(addr);         cycles+=cyccount;
		addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
		doints();
		temp=memory.readmem(addr2); setzn(a-temp); p.c=(a>=temp); cycles+=cyccount;
	}

	function sbc_ind_x() {
		addr=memory.readmem(pc); pc++;      cycles+=cyccount;
		memory.readmem(addr);               cycles+=cyccount; addr=(addr+x)&0xFF;
		addr2=memory.readmem(addr);         cycles+=cyccount;
		addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
		doints();
		temp=memory.readmem(addr2);
		tempc=(p.c)?0:1;
		SBC(temp);
		cycles+=cyccount;
	}

	function ora_ind_y() {
		addr=memory.readmem(pc); pc++;      cycles+=cyccount;
		addr2=memory.readmem(addr);         cycles+=cyccount;
		addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
		if ((addr2^(addr2+y))&0xFF00) { memory.readmem((addr2&0xFF00)+((addr2+y)&0xFF)); cycles+=cyccount; }
		doints();
		a|=memory.readmem(addr2+y); setzn(a); cycles+=cyccount;
	}

	function and_ind_y() {
		addr=memory.readmem(pc); pc++;      cycles+=cyccount;
		addr2=memory.readmem(addr);         cycles+=cyccount;
		addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
		if ((addr2^(addr2+y))&0xFF00) { memory.readmem((addr2&0xFF00)+((addr2+y)&0xFF)); cycles+=cyccount; }
		doints();
		a&=memory.readmem(addr2+y); setzn(a); cycles+=cyccount;
	}

	function eor_ind_y() {
		addr=memory.readmem(pc); pc++;      cycles+=cyccount;
		addr2=memory.readmem(addr);         cycles+=cyccount;
		addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
		if ((addr2^(addr2+y))&0xFF00) { memory.readmem((addr2&0xFF00)+((addr2+y)&0xFF)); cycles+=cyccount; }
		doints();
		a^=memory.readmem(addr2+y); setzn(a); cycles+=cyccount;
	}

	function adc_ind_y() {
		addr=memory.readmem(pc); pc++;      cycles+=cyccount;
		addr2=memory.readmem(addr);         cycles+=cyccount;
		addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
		if ((addr2^(addr2+y))&0xFF00) { memory.readmem((addr2&0xFF00)+((addr2+y)&0xFF)); cycles+=cyccount; }
		doints();
		temp=memory.readmem(addr2+y);
		tempc=(p.c)?1:0;
		ADC(temp);
	}

	function sta_ind_y() {
		addr=memory.readmem(pc); pc++;      cycles+=cyccount;
		addr2=memory.readmem(addr);         cycles+=cyccount;
		addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
		memory.readmem((addr2&0xFF00)+((addr2+y)&0xFF)); cycles+=cyccount;
		doints();
		memory.writemem(addr2+y,a); cycles+=cyccount;
	}

	function lda_ind_y() {
		addr=memory.readmem(pc); pc++;      cycles+=cyccount;
		addr2=memory.readmem(addr);         cycles+=cyccount;
		addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
		if ((addr2^(addr2+y))&0xFF00) { memory.readmem((addr2&0xFF00)+((addr2+y)&0xFF)); cycles+=cyccount; }
		doints();
		a=memory.readmem(addr2+y); setzn(a); cycles+=cyccount;
	}

	function cmp_ind_y() {
		addr=memory.readmem(pc); pc++;      cycles+=cyccount;
		addr2=memory.readmem(addr);         cycles+=cyccount;
		addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
		if ((addr2^(addr2+y))&0xFF00) { memory.readmem((addr2&0xFF00)+((addr2+y)&0xFF)); cycles+=cyccount; }
		doints();
		temp=memory.readmem(addr2+y); cycles+=cyccount;
		setzn(a-temp);
		p.c=(a>=temp);
	}

	function dcp_ind_y() {
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
	}

	function sbc_ind_y() {
		addr=memory.readmem(pc); pc++;      cycles+=cyccount;
		addr2=memory.readmem(addr);         cycles+=cyccount;
		addr2|=(memory.readmem((addr+1)&0xFF)<<8); cycles+=cyccount;
		if ((addr2^(addr2+y))&0xFF00) { memory.readmem((addr2&0xFF00)+((addr2+y)&0xFF)); cycles+=cyccount; }
		doints();
		temp=memory.readmem(addr2+y);
		tempc=(p.c)?0:1;
		SBC(temp);
		cycles+=cyccount;
	}

	function bpl_rel() {
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
	}

	function bmi_rel() {
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
	}

	function bvc_rel() {
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
	}

	function bvs_rel() {
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
	}

	function bcc_rel() {
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
	}

	function bcs_rel() {
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
	}

	function bne_rel() {
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
	}

	function beq_rel() {
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
	}

	function jsr_abs() {
		addr=memory.readmem(pc); pc++;         cycles+=cyccount;
		memory.readmem(0x100+s);               cycles+=cyccount;
		memory.writemem(0x100+s,pc>>8);   s--; cycles+=cyccount;
		memory.writemem(0x100+s,pc&0xFF); s--; cycles+=cyccount;
		doints();
		pc=addr|(memory.readmem(pc)<<8);       cycles+=cyccount;
	}

	function rti() {
		memory.readmem(pc);                    cycles+=cyccount;
		memory.readmem(0x100+s);          s++; cycles+=cyccount;
		temp=memory.readmem(0x100+s);     s++; cycles+=cyccount;
		pc=memory.readmem(0x100+s);       s++; cycles+=cyccount;
		doints();
		pc|=(memory.readmem(0x100+s)<<8);      cycles+=cyccount;
		p.c=temp&1; p.z=temp&2; p.i=temp&4; p.d=temp&8;
		p.v=temp&0x40; p.n=temp&0x80;
	}

	function jmp_abs() {
		addr=memory.readmem(pc);         pc++; cycles+=cyccount;
		doints();
		pc=addr|(memory.readmem(pc)<<8);       cycles+=cyccount;
	}

	function rts() {
		memory.readmem(pc);                    cycles+=cyccount;
		memory.readmem(0x100+s); s++;          cycles+=cyccount;
		pc=memory.readmem(0x100+s); s++;       cycles+=cyccount;
		pc|=(memory.readmem(0x100+s)<<8);      cycles+=cyccount;
		doints();
		memory.readmem(pc); pc++;              cycles+=cyccount;
	}

	function jmp_ind() {
		addr=memory.readmem(pc); pc++;                        cycles+=cyccount;
		addr|=(memory.readmem(pc)<<8);                        cycles+=cyccount;
		pc=memory.readmem(addr);                              cycles+=cyccount;
		doints();
		pc|=memory.readmem((addr&0xFF00)|((addr+1)&0xFF))<<8; cycles+=cyccount;
	}

	function unknown_opcode() {
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
	}
	
	self.initialise = function() {
		for (var i = 0; i<256; i++) {
			opcodeTables[i] = unknown_opcode;
		}
		
		opcodeTables[0x00] =  brk;/*BRK*/
		opcodeTables[0x08] =  php; /*PHP*/
		opcodeTables[0x0A] =  asl_a;/*ASL A*/
		opcodeTables[0x18] =  clc;/*CLC*/
		opcodeTables[0x28] =  plp;/*PLP*/
		opcodeTables[0x2A] =  rol_a;/*ROL A*/
		opcodeTables[0x38] =  sec;/*SEC*/
		opcodeTables[0x48] =  pha;/*PHA*/
		opcodeTables[0x4A] =  lsr_a;/*LSR A*/
		opcodeTables[0x58] =  cli;/*CLI*/
		opcodeTables[0x68] =  pla;/*PLA*/
		opcodeTables[0x6A] =  ror_a;/*ROR A*/
		opcodeTables[0x78] =  sei;/*SEI*/
		opcodeTables[0x88] =  dey;/*DEY*/
		opcodeTables[0x8A] =  txa;/*TXA*/
		opcodeTables[0x98] =  tya;/*TYA*/
		opcodeTables[0x9A] =  txs;/*TXS*/
		opcodeTables[0xA8] =  tay;/*TAY*/
		opcodeTables[0xAA] =  tax;/*TAX*/
		opcodeTables[0xB8] =  clv;/*CLV*/
		opcodeTables[0xBA] =  tsx;/*TSX*/
		opcodeTables[0xC8] =  iny;/*INY*/
		opcodeTables[0xCA] =  dex;/*DEX*/
		opcodeTables[0xD8] =  cld;/*CLD*/
		opcodeTables[0xE8] =  inx;/*INX*/
		opcodeTables[0x1A] =  nop;
		opcodeTables[0x3A] =  nop;
		opcodeTables[0x5A] =  nop;
		opcodeTables[0x7A] =  nop;/*NOP*/
		opcodeTables[0xDA] =  nop; 
		opcodeTables[0xEA] =  nop;
		opcodeTables[0xFA] =  nop;
		opcodeTables[0xF8] =  sed;/*SED*/
		opcodeTables[0x09] =  ora_imm;/*ORA #*/
		opcodeTables[0x29] =  and_imm;/*AND #*/
		opcodeTables[0x49] =  eor_imm;/*EOR #*/
		opcodeTables[0x69] =  adc_imm;/*ADC #*/
		opcodeTables[0x89] =  nop_imm;/*NOP #*/
		opcodeTables[0xA0] =  ldy_imm;/*LDY #*/
		opcodeTables[0xA2] =  ldx_imm;/*LDX #*/
		opcodeTables[0xA9] =  lda_imm;/*LDA #*/
		opcodeTables[0xC0] =  cpy_imm;/*CPY #*/
		opcodeTables[0xC9] =  cmp_imm;/*CMP #*/
		opcodeTables[0xE0] =  cpx_imm;/*CPX #*/
		opcodeTables[0xE9] =  sbc_imm;/*SBC #*/
		opcodeTables[0x04] =  nop_zp;
		opcodeTables[0x44] =  nop_zp;
		opcodeTables[0x64] =  nop_zp;/*NOP zp*/
		opcodeTables[0x05] =  ora_zp;/*ORA zp*/
		opcodeTables[0x06] =  asl_zp;/*ASL zp*/
		opcodeTables[0x24] =  bit_zp;/*BIT zp*/
		opcodeTables[0x25] =  and_zp;/*AND zp*/
		opcodeTables[0x26] =  rol_zp;/*ROL zp*/
		opcodeTables[0x45] =  eor_zp;/*EOR zp*/
		opcodeTables[0x46] =  lsr_zp;/*LSR zp*/
		opcodeTables[0x65] =  adc_zp;/*ADC zp*/
		opcodeTables[0x66] =  ror_zp;/*ROR zp*/
		opcodeTables[0x84] =  sty_zp;/*STY zp*/
		opcodeTables[0x85] =  sta_zp;/*STA zp*/
		opcodeTables[0x86] =  stx_zp;/*STX zp*/
		opcodeTables[0xA4] =  ldy_zp;/*LDY zp*/
		opcodeTables[0xA5] =  lda_zp;/*LDA zp*/
		opcodeTables[0xA6] =  ldx_zp;/*LDX zp*/
		opcodeTables[0xC4] =  cpy_zp;/*CPY zp*/
		opcodeTables[0xC5] =  cmp_zp;/*CMP zp*/
		opcodeTables[0xC6] =  dec_zp;/*DEC zp*/
		opcodeTables[0xE4] =  cpx_zp;/*CPX zp*/
		opcodeTables[0xE5] =  sbc_zp;/*SBC zp*/
		opcodeTables[0xE6] =  inc_zp;/*INC zp*/
		opcodeTables[0x14] =  nop_zp_x;
		opcodeTables[0x34] =  nop_zp_x;
		opcodeTables[0x54] =  nop_zp_x;
		opcodeTables[0x74] =  nop_zp_x;/*NOP zp,x*/
		opcodeTables[0xD4] =  nop_zp_x;
		opcodeTables[0xF4] = nop_zp_x;
		opcodeTables[0x15] =  ora_zp_x;/*ORA zp,x*/
		opcodeTables[0x16] =  asl_zp_x;/*ASL zp,x*/
		opcodeTables[0x35] =  and_zp_x;/*AND zp,x*/
		opcodeTables[0x36] =  rol_zp_x;/*ROL zp,x*/
		opcodeTables[0x55] =  eor_zp_x;/*EOR zp,x*/
		opcodeTables[0x56] =  lsr_zp_x;/*LSR zp,x*/
		opcodeTables[0x75] =  adc_zp_x;/*ADC zp,x*/
		opcodeTables[0x76] =  ror_zp_x;/*ROR zp,x*/
		opcodeTables[0x94] =  sty_zp_x;/*STY zp,x*/
		opcodeTables[0x95] =  sta_zp_x;/*STA zp,x*/
		opcodeTables[0x96] =  stx_zp_y;/*STX zp,y*/
		opcodeTables[0xB4] =  ldy_zp_x;/*LDY zp,x*/
		opcodeTables[0xB5] =  lda_zp_x;/*LDA zp,x*/
		opcodeTables[0xB6] =  ldx_zp_y;/*LDX zp,y*/
		opcodeTables[0xD5] =  cmp_zp_x;/*CMP zp,x*/
		opcodeTables[0xD6] =  dec_zp_x;/*DEC zp,x*/
		opcodeTables[0xF5] =  sbc_zp_x;/*SBC zp,x*/
		opcodeTables[0xF6] =  inc_zp_x;/*INC zp,x*/
		opcodeTables[0x0C] =  nop_abs;/*NOP absolute*/
		opcodeTables[0x0D] =  ora_abs;/*ORA absolute*/
		opcodeTables[0x0E] =  asl_abs;/*ASL absolute*/
		opcodeTables[0x2C] =  bit_abs;/*BIT absolute*/
		opcodeTables[0x2D] =  and_abs;/*AND absolute*/
		opcodeTables[0x2E] =  rol_abs;/*ROL absolute*/
		opcodeTables[0x2F] =  rla_abs;/*RLA absolute*/
		opcodeTables[0x4D] =  eor_abs;/*EOR absolute*/
		opcodeTables[0x4E] =  lsr_abs;/*LSR absolute*/
		opcodeTables[0x6D] =  adc_abs;/*ADC abs*/
		opcodeTables[0x6E] =  ror_abs;/*ROR absolute*/
		opcodeTables[0x8C] =  sty_abs;/*STY absolute*/
		opcodeTables[0x8D] =  sta_abs;/*STA absolute*/
		opcodeTables[0x8E] =  stx_abs;/*STX absolute*/
		opcodeTables[0xAC] =  ldy_abs;/*LDY absolute*/
		opcodeTables[0xAD] =  lda_abs;/*LDA absolute*/
		opcodeTables[0xAE] =  ldx_abs;/*LDX absolute*/
		opcodeTables[0xCC] =  cpy_abs;/*CPY absolute*/
		opcodeTables[0xCD] =  cmp_abs;/*CMP absolute*/
		opcodeTables[0xCE] =  dec_abs;/*DEC absolute*/
		opcodeTables[0xEC] =  cpx_abs;/*CPX absolute*/
		opcodeTables[0xED] =  sbc_abs;/*SBC abs*/
		opcodeTables[0xEE] =  inc_abs;/*INC absolute*/
		opcodeTables[0x19] =  ora_abs_y;/*ORA absolute,y*/
		opcodeTables[0x1D] =  ora_abs_x;/*ORA absolute,x*/
		opcodeTables[0x1E] =  asl_abs_x;/*ASL absolute,x*/
		opcodeTables[0x39] =  and_abs_y;/*AND absolute,y*/
		opcodeTables[0x3D] =  and_abs_x;/*AND absolute,x*/
		opcodeTables[0x3E] =  rol_abs_x;/*ROL absolute,x*/
		opcodeTables[0x59] =  eor_abs_y;/*EOR absolute,y*/
		opcodeTables[0x5D] =  eor_abs_x;/*EOR absolute,x*/
		opcodeTables[0x5E] =  lsr_abs_x;/*LSR absolute,x*/
		opcodeTables[0x79] =  adc_abs_y;/*ADC abs,y*/
		opcodeTables[0x7D] =  adc_abs_x;/*ADC abs,x*/
		opcodeTables[0x7E] =  ror_abs_x;/*ROR absolute,x*/
		opcodeTables[0x99] =  sta_abs_y;/*STA absolute,y*/
		opcodeTables[0x9D] =  sta_abs_x;/*STA absolute,x*/
		opcodeTables[0xB9] =  lda_abs_y;/*LDA absolute,y*/
		opcodeTables[0xBC] =  ldy_abs_x;/*LDY absolute,x*/
		opcodeTables[0xBD] =  lda_abs_x;/*LDA absolute,x*/
		opcodeTables[0xBE] =  ldx_abs_y;/*LDX absolute,y*/
		opcodeTables[0xD9] =  cmp_abs_y;/*CMP absolute,y*/
		opcodeTables[0xDD] =  cmp_abs_x;/*CMP absolute,x*/
		opcodeTables[0xDE] =  dec_abs_x;/*DEC absolute,x*/
		opcodeTables[0xF9] =  sbc_abs_y;/*SBC absolute,y*/
		opcodeTables[0xFD] =  sbc_abs_x;/*SBC abs,x*/
		opcodeTables[0xFE] =  inc_abs_x;/*INC absolute,x*/
		opcodeTables[0x1C] =  nop_abs_x;
		opcodeTables[0x3C] =  nop_abs_x;
		opcodeTables[0x5C] =  nop_abs_x;
		opcodeTables[0x7C] =  nop_abs_x;/*NOP absolute,x*/
		opcodeTables[0xDC] =  nop_abs_x;
		opcodeTables[0xFC] = nop_abs_x;
		opcodeTables[0x01] =  ora_ind_x;/*ORA (,x)*/
		opcodeTables[0x21] =  and_ind_x;/*AND (,x)*/
		opcodeTables[0x41] =  eor_ind_x;/*EOR (,x)*/
		opcodeTables[0x61] =  adc_ind_x;/*ADC (,x)*/
		opcodeTables[0x81] =  sta_ind_x;/*STA (,x)*/
		opcodeTables[0x83] =  sax_ind_x;/*SAX (,x)*/
		opcodeTables[0xA1] =  lda_ind_x;/*LDA (,x)*/
		opcodeTables[0xC1] =  cmp_ind_x;/*CMP (,x)*/
		opcodeTables[0xE1] =  sbc_ind_x;/*SBC (,x)*/
		opcodeTables[0x11] =  ora_ind_y;/*ORA (),y*/
		opcodeTables[0x31] =  and_ind_y;/*AND (),y*/
		opcodeTables[0x51] =  eor_ind_y;/*EOR (),y*/
		opcodeTables[0x71] =  adc_ind_y;/*ADC (),y*/
		opcodeTables[0x91] =  sta_ind_y;/*STA (),y*/
		opcodeTables[0xB1] =  lda_ind_y;/*LDA (),y*/
		opcodeTables[0xD1] =  cmp_ind_y;/*CMP (),y*/
		opcodeTables[0xD3] =  dcp_ind_y;/*DCP (),y*/
		opcodeTables[0xF1] =  sbc_ind_y;/*SBC (),y*/
		opcodeTables[0x10] =  bpl_rel;/*BPL*/
		opcodeTables[0x30] =  bmi_rel;/*BMI*/
		opcodeTables[0x50] =  bvc_rel;/*BVC*/
		opcodeTables[0x70] =  bvs_rel;/*BVS*/
		opcodeTables[0x90] =  bcc_rel;/*BCC*/
		opcodeTables[0xB0] =  bcs_rel;/*BCS*/
		opcodeTables[0xD0] =  bne_rel;/*BNE*/
		opcodeTables[0xF0] =  beq_rel;/*BEQ*/					
		opcodeTables[0x20] =  jsr_abs;/*JSR*/
		opcodeTables[0x40] =  rti;/*RTI*/
		opcodeTables[0x4C] =  jmp_abs;/*JMP*/
		opcodeTables[0x60] =  rts;/*RTS*/
		opcodeTables[0x6C] =  jmp_ind;/*JMP ()*/
								
	}
	
	self.exec6502 = function()	{
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
			
			//execute instruction
			opcodeTables[opcode]();
			
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