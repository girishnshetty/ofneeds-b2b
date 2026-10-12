import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApi } from '../server.mjs';

test('enquiry API saves valid requests, rejects bad requests, and hides records', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'creations-enquiry-test-'));
  const server = createApi({ leadsDirectory: directory, webhook: '' }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const submit = (data, headers={}) => fetch(base+'/api/enquiries', { method:'POST', headers:{'Content-Type':'application/json', ...headers}, body:JSON.stringify(data) });
  try {
    const valid = { fullName:'Test Buyer', companyName:'Test Company', email:'buyer@example.com', quantity:'50 - 100 units', brand:'Raymond', budget:'₹500 - ₹1,500', notes:'API verification only' };
    const response = await submit(valid);
    assert.equal(response.status,201);
    const result = await response.json(); assert.equal(result.saved,true);
    const saved = JSON.parse(await readFile(join(directory, result.reference+'.json'),'utf8'));
    assert.equal(saved.brand,'Raymond'); assert.equal(saved.budget,valid.budget); assert.equal(saved.notification,'not-configured');
    assert.equal((await submit({...valid,email:'bad'})).status,400);
    assert.equal((await submit({...valid,notes:'x'.repeat(4001)})).status,400);
    assert.equal((await submit({...valid,website:'spam'})).status,400);
    assert.equal((await submit(valid,{Origin:'https://other.example'})).status,403);
    assert.equal((await fetch(base+'/api/enquiries')).status,404);
    assert.equal((await fetch(base+'/private-data/enquiries/'+result.reference+'.json')).status,404);
    assert.equal((await readdir(directory)).length,1);
  } finally { await new Promise(resolve=>server.close(resolve)); await rm(directory,{recursive:true,force:true}); }
});

test('storage failure never returns a success confirmation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'creations-failure-test-'));
  const { writeFile } = await import('node:fs/promises');
  const blocked = join(directory,'file'); await writeFile(blocked,'not a directory');
  const server = createApi({leadsDirectory:blocked,webhook:''}).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/enquiries`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fullName:'Test',companyName:'Test',email:'test@example.com',quantity:'100'})});
    assert.equal(response.status,503); assert.equal((await response.json()).saved,undefined);
  } finally { await new Promise(resolve=>server.close(resolve)); await rm(directory,{recursive:true,force:true}); }
});
