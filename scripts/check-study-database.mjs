import fs from "node:fs/promises";
const ref=new URL(process.env.SUPABASE_URL).hostname.split(".")[0];
const headers={Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,"Content-Type":"application/json"};
const query=await fs.readFile("tests/supabase/study.sql","utf8");
if (!/\brollback;\s*$/.test(query) || /^\s*commit\s*;/im.test(query)) throw new Error("Verification must roll back.");
const r=await fetch(`https://api.supabase.com/v1/projects/${encodeURIComponent(ref)}/database/query`,{method:"POST",headers,body:JSON.stringify({query,read_only:false}),signal:AbortSignal.timeout(60000)});
if (!r.ok) {const body=await r.json().catch(()=>({}));console.log(JSON.stringify({status:"failed",httpStatus:r.status,reason:body.message??"Database verification failed"}));process.exit(1);}
console.log(JSON.stringify({status:"passed",scope:"Real database transaction; all synthetic records rolled back",result:await r.json()}));
const a=await fetch(`https://api.supabase.com/v1/projects/${encodeURIComponent(ref)}/advisors/security`,{headers,signal:AbortSignal.timeout(30000)});
if (a.ok) { const data=await a.json();console.log(JSON.stringify({advisors:(data.lints??[]).map(row=>({name:row.name,level:row.level,schema:row.metadata?.schema,entity:row.metadata?.name}))})); }
else console.log(JSON.stringify({advisorsHttpStatus:a.status}));
