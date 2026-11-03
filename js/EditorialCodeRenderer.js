/* Original presentation code: no QRBTF source is incorporated. */
class EditorialCodeRenderer {
    static svg(symbol, options={}) {
        const format=symbol.format,style=options.style||'soft',size=Number(options.moduleSize)||10;
        const q=Math.max(format==='qr'?4:2,Number(options.margin)||4);
        const fg=BarcodeRenderer.validateColour(options.foreground,'#122d3c');
        const bg=BarcodeRenderer.validateColour(options.background,'#ffffff');
        if(format==='maxicode'||format==='pdf417')return BarcodeRenderer.renderSVG(symbol,{moduleSize:size,foreground:fg,background:bg,quietZone:true,quietZoneModules:q,fancy:false});
        const matrix=BarcodeRenderer.getMatrix(symbol),rows=matrix.length,cols=matrix[0].length;
        const dark=(r,c)=>r>=0&&c>=0&&r<rows&&c<cols&&BarcodeRenderer.isDarkModule(matrix[r][c]);
        const protectedCells=new Set(),alignmentTargets=[],protect=(r,c)=>protectedCells.add(r*cols+c);
        if(format==='qr'){
            for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
                if((r<=8&&c<=8)||(r<=8&&c>=cols-8)||(r>=rows-8&&c<=8)||r===6||c===6||(rows>=45&&((r<6&&c>=cols-11)||(c<6&&r>=rows-11))))protect(r,c);
            }
            // Detect standard 5×5 alignment targets and keep their geometry intact.
            for(let r=2;r<rows-2;r++)for(let c=2;c<cols-2;c++){
                let match=true;
                for(let y=-2;y<=2&&match;y++)for(let x=-2;x<=2;x++)if(dark(r+y,c+x)!==(Math.max(Math.abs(y),Math.abs(x))!==1)){match=false;break;}
                if(match){alignmentTargets.push([c-2,r-2]);for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++)protect(r+y,c+x);}
            }
        }
        if(format==='microqr')for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)if(r===0||c===0||(r<=8&&c<=8))protect(r,c);
        if(format==='datamatrix'){
            const rw=(symbol.symbol?.regionDataWidth||cols-2)+2,rh=(symbol.symbol?.regionDataHeight||rows-2)+2;
            for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)if(r%rh===0||r%rh===rh-1||c%rw===0||c%rw===rw-1)protect(r,c);
        }
        if(format==='aztec'){
            const mid=Math.floor(rows/2);
            for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)if((Math.abs(r-mid)<=7&&Math.abs(c-mid)<=7)||(!symbol.compact&&((r-mid)%16===0||(c-mid)%16===0)))protect(r,c);
        }
        const rect=(x,y,w,h,rx=0,color=fg)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${color}"/>`;
        const width=(cols+q*2)*size,height=(rows+q*2)*size;
        const parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,rect(0,0,width,height,0,bg)];
        for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)if(dark(r,c)){
            const x=(c+q)*size,y=(r+q)*size;
            if(style==='classic')parts.push(rect(x,y,size,size));
            else if(protectedCells.has(r*cols+c))parts.push(rect(x,y,size,size,size*.16));
            else if(style==='soft')parts.push(rect(x+size*.015,y+size*.015,size*.97,size*.97,size*.18));
            else if(style==='bevel'){
                const d=size*.08;
                parts.push(`<path fill="${fg}" d="M${x+d} ${y}h${size-2*d}l${d} ${d}v${size-2*d}l${-d} ${d}h${2*d-size}l${-d} ${-d}v${2*d-size}Z"/>`);
            }else{
                // Round only exposed corners; connected neighbours keep their shared edge.
                const k=size*.28,up=dark(r-1,c),down=dark(r+1,c),left=dark(r,c-1),right=dark(r,c+1);
                const a=!up&&!left?k:0,b=!up&&!right?k:0,d=!down&&!right?k:0,e=!down&&!left?k:0;
                parts.push(`<path fill="${fg}" d="M${x+a} ${y}H${x+size-b}Q${x+size} ${y} ${x+size} ${y+b}V${y+size-d}Q${x+size} ${y+size} ${x+size-d} ${y+size}H${x+e}Q${x} ${y+size} ${x} ${y+size-e}V${y+a}Q${x} ${y} ${x+a} ${y}Z"/>`);
            }
        }
        if(format==='qr'&&style!=='classic')for(const[c,r]of alignmentTargets){const x=(c+q)*size,y=(r+q)*size;parts.push(rect(x,y,5*size,5*size,0,bg),rect(x,y,5*size,5*size,size*.4),rect(x+size,y+size,3*size,3*size,size*.24,bg),rect(x+2*size,y+2*size,size,size,size*.16));}
        if((format==='qr'||format==='microqr')&&options.eyes==='soft'){
            const eyes=format==='qr'?[[0,0],[cols-7,0],[0,rows-7]]:[[0,0]];
            for(const[c,r]of eyes){const x=(c+q)*size,y=(r+q)*size;
                parts.push(rect(x,y,7*size,7*size,0,bg),rect(x,y,7*size,7*size,size*.6),rect(x+size,y+size,5*size,5*size,size*.3,bg),rect(x+2*size,y+2*size,3*size,3*size,size*.25));
            }
        }
        parts.push('</svg>');return parts.join('');
    }
}
