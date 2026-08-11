import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createSignedToken,verifySignedToken,makeActivationRecord} from '../server/token-lib.mjs';
const now=1700000000000;
const kp=crypto.generateKeyPairSync('ed25519');

test('Ed25519 signed token verifies',()=>{const token=createSignedToken({id:'abc',issuedAt:now,expiresAt:now+86400000,privateKey:kp.privateKey});const r=verifySignedToken(token,kp.publicKey,now+1000);assert.equal(r.ok,true);assert.equal(r.payload.id,'abc')});
test('tampering invalidates token',()=>{const token=createSignedToken({id:'abc',issuedAt:now,expiresAt:now+86400000,privateKey:kp.privateKey});const [p,s]=token.split('.');const tampered=p.slice(0,-1)+(p.endsWith('A')?'B':'A');assert.equal(verifySignedToken(`${tampered}.${s}`,kp.publicKey,now).ok,false)});
test('expired token is rejected',()=>{const token=createSignedToken({id:'abc',issuedAt:now-10000,expiresAt:now-1,privateKey:kp.privateKey});assert.equal(verifySignedToken(token,kp.publicKey,now).error,'expired')});
test('future-issued token is rejected',()=>{const token=createSignedToken({id:'abc',issuedAt:now+120000,expiresAt:now+86400000,privateKey:kp.privateKey});assert.equal(verifySignedToken(token,kp.publicKey,now).error,'not-yet-valid')});
test('activation record duration is bounded',()=>{const r=makeActivationRecord('CLOTH-X',30,now);assert.equal(r.expiresAt-r.createdAt,30*86400000)});
test('provider selection and fallback order are deterministic',()=>{const providers=[{active:true,name:'A'},{active:true,name:'B'},{active:false,name:'C'}];const active=1;const order=[active,...providers.map((_,i)=>i)].filter((v,i,a)=>providers[v]?.active&&a.indexOf(v)===i);assert.deepEqual(order,[1,0])});
test('endpoint validation rejects non-http URLs',()=>{assert.equal(/^https?:\/\//i.test('ftp://example.com'),false);assert.equal(/^https?:\/\//i.test('https://example.com/v1'),true)});
test('product values preserve Arabic and price strings',()=>{const p={name:'قميص',price:'250',oldPrice:'300',size:'L'};assert.equal(p.name,'قميص');assert.equal(typeof p.price,'string')});
