import assert from 'node:assert/strict';
import { nearestExit } from '../../src/ui/ready-transition.js';
assert(nearestExit({left:20,right:200,top:100,bottom:120},800,600).x<0);
assert(nearestExit({left:740,right:780,top:100,bottom:140},800,600).x>0);
assert(nearestExit({left:100,right:300,top:20,bottom:60},800,600).y<0);
assert(nearestExit({left:100,right:700,top:500,bottom:580},800,600).y>0);
console.log('Passed: nearest-edge exit directions.');
