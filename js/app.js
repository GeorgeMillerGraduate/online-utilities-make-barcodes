document.addEventListener('DOMContentLoaded',()=>{
    const $=id=>document.getElementById(id),canvas=$('barcodeCanvas');
    const definitions={qr:{name:'QR Code',generate:(d,o)=>QRGenerator.generate(d,o)},microqr:{name:'Micro QR',generate:(d,o)=>MicroQRGenerator.generate(d,o)},datamatrix:{name:'Data Matrix',generate:(d,o)=>DataMatrixGenerator.generate(d,o)},aztec:{name:'Aztec',generate:(d,o)=>AztecGenerator.generate(d,o)},pdf417:{name:'PDF417',generate:(d,o)=>PDF417Generator.generate(d,o)},maxicode:{name:'MaxiCode',generate:(d,o)=>MaxiCodeGenerator.generateDetailed(d,{mode:4})}};
    let symbol=null,svg='',payload='',verified=false,busy=false,revision=0;
    const hints={qr:'Data cells and corner markers can be styled; essential marker positions and contrast are preserved.',microqr:'Compact symbols have less room for decoration. Essential marker positions and contrast are preserved.',datamatrix:'Data cells can be styled. Solid and alternating borders in every data region remain square.',aztec:'Data cells can be styled. The central target, mode area and reference lines stay protected.',pdf417:'Encoded bars remain precise. Use colour and the surrounding presentation to give this format character.',maxicode:'Hexagonal cells and the circular target retain their original geometry. Colour styling is available.'};
    ZXingWASM.prepareZXingModule({overrides:{locateFile:path=>new URL('js/vendor/'+path,document.baseURI).href}});
    function controls(){
        $('generate').disabled=busy;
        $('generate').textContent=busy?'Working…':'✧ Generate code';
        $('downloadPng').disabled=!verified||busy;$('downloadSvg').disabled=!verified||busy;$('copySvg').disabled=!verified||busy;$('testScan').disabled=busy||(!symbol);
    }
    function status(text){$('status').textContent=text;}
    function verification(text,failed=false){$('verification').textContent=text;$('verification').classList.toggle('failed',failed);}
    function clearPreview(){
        revision++;symbol=null;svg='';payload='';verified=false;busy=false;
        canvas.hidden=true;$('emptyState').hidden=false;$('dimensions').textContent='—';$('bytes').textContent='—';verification('Not generated');controls();
    }
    function inputCount(){ $('characterCount').textContent=Array.from($('dataInput').value).length+' characters'; }
    function options(moduleSize=12){return {style:$('moduleStyle').value,eyes:$('eyeStyle').value,moduleSize,margin:Number($('margin').value),foreground:$('foreground').value,background:$('background').value};}
    function luminance(hex){const v=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return v[0]*.2126+v[1]*.7152+v[2]*.0722;}
    function checkContrast(){const f=luminance($('foreground').value),b=luminance($('background').value);if(f>=b||(b+.05)/(f+.05)<4.5)throw Error('Choose dark modules on a light background with stronger contrast.');}
    function loadImage(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('The preview image could not be loaded.'));im.src=src;});}
    async function svgImage(text){const url=URL.createObjectURL(new Blob([text],{type:'image/svg+xml'}));try{return await loadImage(url);}finally{URL.revokeObjectURL(url);}}
    function draw(im){canvas.width=im.naturalWidth;canvas.height=im.naturalHeight;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(im,0,0);}
    async function decodeCanvas(target=canvas,expected=payload){const results=await ZXingWASM.readBarcodes(target.getContext('2d').getImageData(0,0,target.width,target.height),{tryHarder:true,maxNumberOfSymbols:8});return results.some(r=>r.text===expected);}
    async function verify(){
        if(!symbol)return;
        const ticket=revision;verified=false;verification('Checking contents…');controls();
        try{const ok=await decodeCanvas();if(ticket!==revision)return;verified=ok;verification(ok?'✓ Contents verified':'Scan check failed',!ok);status(ok?'The decoder recovered your exact input. Ready to export.':'The decoder could not recover your exact input. Try Classic squares, standard markers or a larger margin.');}
        catch(e){if(ticket!==revision)return;verification('Verification unavailable',true);status('Could not run the local decoder: '+e.message);}
        if(ticket===revision)controls();
    }
    async function render(){
        if(!symbol)return;const ticket=++revision;verified=false;controls();
        try{
            checkContrast();svg=EditorialCodeRenderer.svg(symbol,options());const im=await svgImage(svg);if(ticket!==revision)return;draw(im);canvas.hidden=false;$('emptyState').hidden=true;
            $('dimensions').textContent=BarcodeRenderer.getMatrix(symbol)[0].length+' × '+BarcodeRenderer.getMatrix(symbol).length+' modules';
            $('bytes').textContent=new TextEncoder().encode(payload).length+' bytes';await verify();
        }catch(e){if(ticket===revision){verified=false;verification('Not verified',true);status(e.message);controls();}}
    }
    async function generate(){
        const data=$('dataInput').value;if(!data.length){status('Enter text or a URL first.');$('dataInput').focus();return;}
        try{const f=$('format').value;symbol=definitions[f].generate(data,{errorCorrection:f==='pdf417'?Number($('errorCorrection').value):$('errorCorrection').value});symbol.format=f;payload=data;status('Generating and checking the code…');await render();}
        catch(e){clearPreview();status(e.message||'This data does not fit the selected format.');verification('Generation failed',true);}
    }
    function formatSettings(){
        const f=$('format').value;$('formatLabel').textContent=definitions[f].name;
        document.querySelectorAll('[data-format]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.format===f)));
        $('formatHint').textContent=hints[f];
        const geometric=['pdf417','maxicode'].includes(f);$('moduleStyle').disabled=geometric;document.querySelectorAll('[data-style]').forEach(b=>b.disabled=geometric);
        $('eyeStyle').disabled=!['qr','microqr'].includes(f);
        const ec=$('errorCorrection');ec.replaceChildren();ec.disabled=['datamatrix','maxicode'].includes(f);
        const entries=f==='pdf417'?Array.from({length:9},(_,i)=>[String(i),'Level '+i]):f==='datamatrix'?[['M','Automatic ECC200']]:f==='maxicode'?[['M','Mode 4 — standard']]:f==='aztec'?[['L','23%'],['M','33%'],['Q','50%'],['H','65%']]:f==='microqr'?[['L','Low (L)'],['M','Medium (M)'],['Q','Quartile (Q)']]:[['L','Low (L)'],['M','Medium (M)'],['Q','Quartile (Q)'],['H','High (H)']];
        for(const[v,t]of entries){const o=document.createElement('option');o.value=v;o.textContent=t;ec.appendChild(o);}ec.value=f==='pdf417'?'2':f==='qr'?'H':'M';
        $('margin').min=f==='qr'?'4':'2';if(Number($('margin').value)<Number($('margin').min))$('margin').value=$('margin').min;$('marginValue').textContent=$('margin').value+' modules';
    }
    function download(blob,ext){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='jenga-'+$('format').value+'-'+Date.now()+'.'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
    $('downloadPng').addEventListener('click',async()=>{
        if(!verified)return;const ticket=revision;
        try{const target=document.createElement('canvas');const im=await svgImage(EditorialCodeRenderer.svg(symbol,options(Number($('exportScale').value))));target.width=im.naturalWidth;target.height=im.naturalHeight;target.getContext('2d').drawImage(im,0,0);
            if(!await decodeCanvas(target,payload))throw Error('The export did not pass the contents check. Try a different scale.');if(ticket!==revision)return;target.toBlob(b=>{if(b&&ticket===revision)download(b,'png');},'image/png');
        }catch(e){status(e.message);}
    });
    $('downloadSvg').addEventListener('click',()=>{if(verified)download(new Blob([svg],{type:'image/svg+xml'}),'svg');});
    $('copySvg').addEventListener('click',async()=>{if(!verified)return;try{await navigator.clipboard.writeText(svg);status('SVG copied.');}catch{status('Clipboard access was blocked. Use Download SVG instead.');}});
    $('generate').addEventListener('click',generate);$('clear').addEventListener('click',()=>{clearPreview();$('dataInput').value='';inputCount();status('Cleared.');});$('testScan').addEventListener('click',verify);
    $('dataInput').addEventListener('input',()=>{clearPreview();inputCount();status('Input changed. Generate a new code.');});
    $('format').addEventListener('change',()=>{clearPreview();formatSettings();if($('dataInput').value)generate();});
    document.querySelectorAll('[data-format]').forEach(b=>b.addEventListener('click',()=>{$('format').value=b.dataset.format;$('format').dispatchEvent(new Event('change'));}));
    function updateStyles(){document.querySelectorAll('[data-style]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.style===$('moduleStyle').value)));if(symbol)render();}
    $('moduleStyle').addEventListener('change',updateStyles);document.querySelectorAll('[data-style]').forEach(b=>b.addEventListener('click',()=>{$('moduleStyle').value=b.dataset.style;updateStyles();}));
    for(const id of ['eyeStyle','margin','foreground','background'])$(id).addEventListener(id==='margin'?'input':'change',()=>{$('marginValue').textContent=$('margin').value+' modules';$('foregroundHex').textContent=$('foreground').value.toUpperCase();$('backgroundHex').textContent=$('background').value.toUpperCase();if(symbol)render();});
    document.querySelectorAll('[data-colour]').forEach(b=>b.addEventListener('click',()=>{$('foreground').value=b.dataset.colour;$('foreground').dispatchEvent(new Event('change'));}));
    $('errorCorrection').addEventListener('change',generate);    formatSettings();inputCount();generate();
});
