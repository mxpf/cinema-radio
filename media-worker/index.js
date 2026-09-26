// Public, read-only streaming endpoint. Uploads stay in authenticated Wrangler.
export default {
  async fetch(request, env) {
    const headers = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, If-Range',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, ETag',
      'Accept-Ranges': 'bytes',
      'X-Content-Type-Options': 'nosniff'
    });
    if (request.method === 'OPTIONS') return new Response(null, {status:204,headers});
    if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405,headers});
    let key;
    try { key = decodeURIComponent(new URL(request.url).pathname.slice(1)); }
    catch { return new Response('Invalid path',{status:400,headers}); }
    if (!/^[a-zA-Z0-9_.-]+\.opus$/.test(key)) return new Response('Not found',{status:404,headers});
    try {
      const meta = await env.AUDIO.head(key);
      if (!meta) return new Response('Not found',{status:404,headers});
      meta.writeHttpMetadata(headers);
      headers.set('Content-Type','audio/ogg');
      headers.set('ETag',meta.httpEtag);
      headers.set('Cache-Control','public, max-age=86400');
      headers.set('Last-Modified',meta.uploaded.toUTCString());
      let start=0,end=meta.size-1,status=200;
      const range = request.headers.get('Range');
      const ifRange = request.headers.get('If-Range');
      if (range && (!ifRange || ifRange === meta.httpEtag || ifRange === meta.uploaded.toUTCString())) {
        const match=/^bytes=(\d*)-(\d*)$/.exec(range);
        if (match && (match[1] || match[2])) {
          if (!match[1]) start=Math.max(0,meta.size-Number(match[2]));
          else {start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
          if (!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=meta.size) {
            headers.set('Content-Range',`bytes */${meta.size}`);
            return new Response(null,{status:416,headers});
          }
          status=206;
          headers.set('Content-Range',`bytes ${start}-${end}/${meta.size}`);
        }
      }
      headers.set('Content-Length',String(end-start+1));
      if(request.method==='HEAD')return new Response(null,{status,headers});
      const object=await env.AUDIO.get(key,status===206?{range:{offset:start,length:end-start+1}}:undefined);
      if(!object)return new Response('Not found',{status:404});
      return new Response(object.body,{status,headers});
    } catch(error) {
      console.error(JSON.stringify({event:'audio_read_failed',key,message:String(error)}));
      headers.delete('Content-Length');headers.delete('Content-Range');
      return new Response('Audio temporarily unavailable',{status:503,headers});
    }
  }
};
