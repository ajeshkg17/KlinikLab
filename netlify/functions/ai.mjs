import {runGemini,checkAccess,errorPayload} from '../../server/ai-core.mjs';
export const handler=async event=>{
 try{
   if(event.httpMethod!=='POST')return {statusCode:405,body:JSON.stringify({error:'Use POST.'})};
   // Protected against casual public quota abuse by a secret passphrase configured at deploy time.
   checkAccess(event.headers?.['x-ai-access-code']||event.headers?.['X-Ai-Access-Code'],process.env,true);
   if((event.body||'').length>18000)throw Object.assign(new Error('Request too large.'),{status:413});
   const payload=JSON.parse(event.body||'null');
   const output=await runGemini(payload);
   return {statusCode:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'},body:JSON.stringify(output)};
 }catch(err){const {status,body}=errorPayload(err);return {statusCode:status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'},body:JSON.stringify(body)}}
};
