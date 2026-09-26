const fs=require('node:fs');const assert=require('node:assert/strict');
(async()=>{
 const worker=(await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('media-worker/index.js','utf8')).toString('base64'))).default;
 const bytes=Buffer.from('0123456789');
 const metadata={size:10,httpEtag:'"test"',uploaded:new Date(0),writeHttpMetadata(){}};
 const env={AUDIO:{async head(k){return k==='film.opus'?metadata:null},async get(k,opt){const range=opt?.range;return {body:range?bytes.subarray(range.offset,range.offset+range.length):bytes}}}};
 const get=(headers={},method='GET',path='film.opus')=>worker.fetch(new Request('https://media.example/'+path,{headers,method}),env);
 let r=await get();assert.equal(r.status,200);assert.equal(await r.text(),'0123456789');
 r=await get({Range:'bytes=3-5'});assert.equal(r.status,206);assert.equal(r.headers.get('content-range'),'bytes 3-5/10');assert.equal(await r.text(),'345');
 r=await get({Range:'bytes=-2'});assert.equal(await r.text(),'89');
 r=await get({Range:'bytes=20-'});assert.equal(r.status,416);
 r=await get({},'HEAD');assert.equal(r.headers.get('content-length'),'10');assert.equal(await r.text(),'');
 assert.equal((await get({},'PUT')).status,405);
 assert.equal((await get({},'GET','missing.opus')).status,404);
 assert.equal((await get({},'GET','private.json')).status,404);
 r=await get({Range:'bytes=3-5','If-Range':'"old"'});assert.equal(r.status,200);
 console.log('Media endpoint: streams, ranges, suffixes, invalid offsets, HEAD, method restrictions, missing files and validators passed.');
})().catch(e=>{console.error(e);process.exit(1)});
