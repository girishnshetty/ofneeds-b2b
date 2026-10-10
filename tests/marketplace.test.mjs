import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';
import { once } from 'node:events';

// A separate data directory makes mutation checks independent of the user's marketplace.
let child, fixture, mailServer; const mail = [];
const base = 'http://127.0.0.1:4179';
async function request(path, data, cookie) {
  const response = await fetch(base + path, { method: data ? 'POST' : 'GET', headers: { ...(data ? {'content-type':'application/json'} : {}), ...(cookie ? {cookie} : {}) }, ...(data ? {body:JSON.stringify(data)} : {}) });
  return { status:response.status, data:await response.json(), cookie:response.headers.get('set-cookie')?.split(';')[0] };
}
async function login(email,password) { const response = await request('/api/auth/login',{email,password}); assert.equal(response.status,200); return response.cookie; }
before(async () => {
  await mkdir('.tmp',{recursive:true}); fixture = await mkdtemp(resolve('.tmp/premium-test-'));
  await cp('server.mjs',join(fixture,'server.mjs')); await cp('marketplace-services.mjs',join(fixture,'marketplace-services.mjs')); await cp('catalog',join(fixture,'catalog'),{recursive:true}); await mkdir(join(fixture,'public'));
  mailServer = createServer(async(req,res)=>{ let raw=''; for await(const chunk of req) raw += chunk; mail.push(JSON.parse(raw)); res.end('{}'); }); await new Promise(resolve=>mailServer.listen(0,'127.0.0.1',resolve));
  child = spawn(process.execPath,[join(fixture,'server.mjs')],{env:{...process.env,PORT:'4179',NODE_ENV:'test',DEMO_MODE:'true',SITE_URL:'https://example.test',MAIL_FROM:'test@example.test',SUPPORT_EMAIL:'admin@example.test',MAIL_GATEWAY_TOKEN:'test-token',MAIL_GATEWAY_URL:`http://127.0.0.1:${mailServer.address().port}`},stdio:['ignore','pipe','pipe']});
  let output = ''; child.stdout.on('data',chunk=>output+=chunk); child.stderr.on('data',chunk=>output+=chunk);
  for (let i=0;i<50;i++) { try { if ((await request('/api/health')).status===200) return; } catch {} await new Promise(resolve=>setTimeout(resolve,100)); }
  throw new Error('Fixture server failed: '+output);
});
after(async () => { if (child && child.exitCode === null) { child.kill(); await once(child,'exit'); } if (mailServer) await new Promise(resolve=>mailServer.close(resolve)); });

test('Public brand discovery never returns products, inventory or supplier contacts',async()=>{
  const result = await request('/api/catalog'); assert.equal(result.status,200); assert.equal(result.data.catalogAccess,false); assert.deepEqual(result.data.products,[]); assert.deepEqual(result.data.dealers,[]); assert.equal(result.data.brandDirectory.length,147); assert.equal(new Set(result.data.categories).size,result.data.categories.length); assert.ok(!result.data.categories.includes('Backpacks & Bags'));
  assert.equal((await request('/api/contact?dealerId=dealer-1')).status,401);
});
test('Buyer access exposes prices; supplier catalog hides other marketplace prices',async()=>{
  const buyer = await login('buyer@ofneeds.in','Buyer@1234'), supplier = await login('dealer@ofneeds.in','Dealer@1234');
  const buyerCatalog = await request('/api/catalog',null,buyer), supplierCatalog = await request('/api/catalog',null,supplier);
  assert.ok(buyerCatalog.data.products.some(product=>product.price>0)); assert.ok(supplierCatalog.data.products.every(product=>product.price===null && product.tiers.length===0)); assert.equal((await request('/api/contact?dealerId=dealer-2',null,supplier)).status,403);
  assert.equal((await request('/api/contact?dealerId=dealer-2',null,buyer)).status,200);
});
test('Unavailable stock cannot be held, but can receive a quotation request',async()=>{
  const buyer = await login('buyer@ofneeds.in','Buyer@1234'); const catalog = await request('/api/catalog',null,buyer); const product = catalog.data.products.find(product=>product.available===0); assert.ok(product);
  assert.equal((await request('/api/reservations',{productId:product.id,quantity:product.moq},buyer)).status,409);
  assert.equal((await request('/api/rfqs',{productId:product.id,quantity:product.moq,deliveryLocation:'Test location'},buyer)).status,201);
});
test('Pending accounts stay gated and dashboard supplies review context',async()=>{
  const pending = await login('sana@brightbox.in','Company@1234'); assert.equal((await request('/api/catalog',null,pending)).data.catalogAccess,false); assert.equal((await request('/api/dashboard',null,pending)).data.pending,true); assert.equal((await request('/api/reservations',{productId:'p-1',quantity:10},pending)).status,403);
});
test('Assistance requests are persisted, validated and visible only to admin',async()=>{
  assert.equal((await request('/api/requests',{type:'support',name:'Test',email:'invalid',message:'Help'})).status,400);
  const result = await request('/api/requests',{type:'support',name:'Test reviewer',email:'test@example.com',message:'Test assistance request'}); assert.equal(result.status,201); assert.equal(result.data.status,'saved');
  const admin = await login('admin@ofneeds.in','Admin@1234'), buyer = await login('buyer@ofneeds.in','Buyer@1234');
  assert.ok((await request('/api/dashboard',null,admin)).data.requests.some(item=>item.id===result.data.id)); assert.equal((await request('/api/dashboard',null,buyer)).data.requests,undefined);
  const saved = JSON.parse(await readFile(join(fixture,'data','marketplace.json'),'utf8')); assert.ok(saved.requests.some(item=>item.id===result.data.id));
  assert.equal(saved.requests.find(item=>item.id===result.data.id).deliveryStatus,'sent'); assert.ok(mail.some(item=>item.to==='admin@example.test' && item.text.includes('Test assistance request')));
});
test('Business reviews require reasons and approval evidence, with a stored history',async()=>{
  const admin = await login('admin@ofneeds.in','Admin@1234'), dashboard = await request('/api/dashboard',null,admin), pending = dashboard.data.pendingUsers[0];
  assert.equal((await request('/api/admin/review',{userId:pending.id,status:'rejected'},admin)).status,400);
  assert.equal((await request('/api/admin/review',{userId:pending.id,status:'approved',reason:'Test approval'},admin)).status,400);
  const result = await request('/api/admin/review',{userId:pending.id,status:'rejected',reason:'Please supply GST evidence'},admin); assert.equal(result.status,200); assert.equal(result.data.user.reviewHistory.at(-1).reason,'Please supply GST evidence');
});
test('Registration preserves private documents and remains pending until review',async()=>{
  const result = await request('/api/auth/register',{role:'buyer',name:'Test buyer',companyName:'Test Company',email:'registered@example.com',mobile:'9999999999',gstin:'29ABCDE1234F1Z5',pan:'ABCDE1234F',pin:'560001',city:'Bengaluru',state:'Karnataka',password:'TestOnly@1234',companyType:'Corporate gifting company',billingAddress:'Test billing address',shippingAddress:'Test shipping address',documents:[{name:'test.pdf',type:'gst_certificate',dataUrl:'data:application/pdf;base64,JVBERi0xLjQKJUVPRg=='}]});
  assert.equal(result.status,201); assert.equal(result.data.status,'pending');
  const user = await login('registered@example.com','TestOnly@1234'); const profile = await request('/api/me',null,user); assert.equal(profile.data.user.documents[0].storageName,undefined); const doc=profile.data.user.documents[0]; assert.equal((await request('/api/admin/documents/'+doc.id,null,user)).status,403); assert.equal((await request('/api/catalog',null,user)).data.catalogAccess,false);
});

test('Supplier photos enforce ownership, consent, content validation and private catalog access',async()=>{
  const supplier=await login('dealer@ofneeds.in','Dealer@1234'), buyer=await login('buyer@ofneeds.in','Buyer@1234');
  const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lZkAAAAASUVORK5CYII=';
  assert.equal((await request('/api/dealer/photo',{productId:'p-3',photo:{confirmed:true,dataUrl:png}},supplier)).status,404);
  assert.equal((await request('/api/dealer/photo',{productId:'p-1',photo:{confirmed:false,dataUrl:png}},supplier)).status,400);
  assert.equal((await request('/api/dealer/photo',{productId:'p-1',photo:{confirmed:true,dataUrl:'data:image/png;base64,aGVsbG8='}},supplier)).status,400);
  assert.equal((await request('/api/dealer/photo',{productId:'p-1',photo:{confirmed:true,dataUrl:png}},buyer)).status,403);
  const result=await request('/api/dealer/photo',{productId:'p-1',photo:{confirmed:true,dataUrl:png}},supplier); assert.equal(result.status,200); assert.equal(result.data.product.photo.file,undefined);
  assert.equal((await fetch(base+result.data.product.image)).status,403);
  const image=await fetch(base+result.data.product.image,{headers:{cookie:buyer}}); assert.equal(image.status,200); assert.equal(image.headers.get('content-type'),'image/png'); assert.ok(image.headers.get('cache-control').includes('private'));
});

test('Supplier profile changes cannot change identity or authorization and are visible to verified accounts',async()=>{
  const supplier=await login('dealer@ofneeds.in','Dealer@1234');
  assert.equal((await request('/api/dealer/profile',{about:'Test supplier introduction',deliveryCoverage:'Bengaluru',capabilities:'Packaging on request',businessName:'Forged identity',brands:['New brand'],verified:true},supplier)).status,200);
  const buyer=await login('buyer@ofneeds.in','Buyer@1234'), catalog=await request('/api/catalog',null,buyer); const dealer=catalog.data.dealers.find(item=>item.id==='dealer-1');
  assert.equal(dealer.about,'Test supplier introduction'); assert.equal(dealer.businessName,'Peak Supply Co.'); assert.ok(!dealer.brands.includes('New brand')); assert.ok(dealer.authorizations.every(item=>item.documentId===undefined));
  assert.equal((await request('/api/catalog')).data.dealers.length,0);
});

test('Recovery links are opaque, one use, expiring, and invalidate existing sessions',async()=>{
  const cookie=await login('buyer@ofneeds.in','Buyer@1234');
  const known=await request('/api/auth/forgot-password',{email:'buyer@ofneeds.in'}), unknown=await request('/api/auth/forgot-password',{email:'missing@example.test'}); assert.deepEqual(known.data,unknown.data);
  const message=mail.findLast(item=>item.to==='buyer@ofneeds.in'), token=message.text.match(/#reset\/([a-f0-9]{64})/)[1]; assert.ok(token);
  const saved=JSON.parse(await readFile(join(fixture,'data','marketplace.json'),'utf8')); assert.ok(!JSON.stringify(saved).includes(token)); assert.ok(Date.parse(saved.users.find(item=>item.id==='buyer-1').recovery.expiresAt)>Date.now());
  assert.equal((await request('/api/me',null,cookie)).data.user.recovery,undefined);
  assert.equal((await request('/api/auth/reset-password',{token:'invalid',password:'NewPassword@1234'})).status,400);
  assert.equal((await request('/api/auth/reset-password',{token,password:'short'})).status,400);
  assert.equal((await request('/api/auth/reset-password',{token,password:'NewPassword@1234'})).status,200);
  assert.equal((await request('/api/auth/reset-password',{token,password:'AgainPassword@1234'})).status,400);
  assert.equal((await request('/api/me',null,cookie)).data.user,null);
  assert.equal((await request('/api/auth/login',{email:'buyer@ofneeds.in',password:'Buyer@1234'})).status,401);
  assert.equal((await request('/api/auth/login',{email:'buyer@ofneeds.in',password:'NewPassword@1234'})).status,200);
});

test('Public service configuration excludes provider secrets',async()=>{
  const config=await request('/api/config'); assert.equal(config.data.recoveryReady,true); assert.ok(!JSON.stringify(config.data).includes('test-token')); assert.ok(!JSON.stringify(config.data).includes('MAIL_GATEWAY'));
});

test('Production mode refuses to reuse demonstration accounts',async()=>{
  const production=spawn(process.execPath,[join(fixture,'server.mjs')],{env:{...process.env,PORT:'4180',DEMO_MODE:'false'},stdio:['ignore','pipe','pipe']}); let errors=''; production.stderr.on('data',chunk=>errors+=chunk); const [code]=await once(production,'exit'); assert.equal(code,1); assert.ok(errors.includes('Production mode requires a separate marketplace data store'));
});
