import { circlesOverlap } from '../player/player-health.js';

function triangleVertices(enemy) {
  const {widthPixels:w,heightPixels:h}=enemy.type.appearance;
  const {x,y}=enemy.sprite;
  return [{x,y:y-h/2},{x:x+w/2,y:y+h/2},{x:x-w/2,y:y+h/2}];
}
function edgeCross(a,b,x,y) { return (b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x); }
function triangleTouchesCircle(enemy,center,radius) {
  const vertices=triangleVertices(enemy);
  let inside=true;
  for(let i=0;i<3;i++) {
    const a=vertices[i],b=vertices[(i+1)%3];
    if(edgeCross(a,b,center.x,center.y)<0)inside=false;
    const dx=b.x-a.x,dy=b.y-a.y;
    const t=Math.max(0,Math.min(1,((center.x-a.x)*dx+(center.y-a.y)*dy)/(dx*dx+dy*dy)));
    if((center.x-a.x-t*dx)**2+(center.y-a.y-t*dy)**2<=radius*radius)return true;
  }
  return inside;
}
function triangleContactTime(enemy,fromX,fromY,toX,toY,radius) {
  const vertices=triangleVertices(enemy);
  let enter=0,exit=1;
  for(let i=0;i<3;i++) {
    const a=vertices[i],b=vertices[(i+1)%3];
    const start=edgeCross(a,b,fromX,fromY);
    const change=edgeCross(a,b,toX,toY)-start;
    const bound=-radius*Math.hypot(b.x-a.x,b.y-a.y);
    if(change===0) {if(start<bound)return null;continue;}
    const t=(bound-start)/change;
    if(change>0)enter=Math.max(enter,t);else exit=Math.min(exit,t);
    if(enter>exit)return null;
  }
  return enter;
}


export function enemyTouchesCircle(enemy, center, radius) {
  const shape = enemy.type.appearance;
  if (shape.shape === 'triangle') return triangleTouchesCircle(enemy,center,radius);
  if (shape.shape === 'circle') return circlesOverlap(center, radius, enemy.sprite, shape.radiusPixels);
  const dx = center.x - Math.max(enemy.sprite.x-shape.widthPixels/2, Math.min(center.x,enemy.sprite.x+shape.widthPixels/2));
  const dy = center.y - Math.max(enemy.sprite.y-shape.heightPixels/2, Math.min(center.y,enemy.sprite.y+shape.heightPixels/2));
  return dx*dx + dy*dy <= radius*radius;
}

/** Earliest segment contact; null means no hit this frame. */
export function projectileContactTime(enemy, fromX, fromY, toX, toY, projectileRadius) {
  const shape = enemy.type.appearance;
  if(shape.shape==='triangle')return triangleContactTime(enemy,fromX,fromY,toX,toY,projectileRadius);
  const dx=toX-fromX, dy=toY-fromY;
  if (shape.shape === 'rectangle') {
    // Sweep against an expanded box, using the projectile's collision radius.
    let enter=0, exit=1;
    for (const [start, delta, center, half] of [[fromX,dx,enemy.sprite.x,shape.widthPixels/2],[fromY,dy,enemy.sprite.y,shape.heightPixels/2]]) {
      const min=center-half-projectileRadius, max=center+half+projectileRadius;
      if (delta===0) { if(start<min||start>max)return null; continue; }
      const a=(min-start)/delta, b=(max-start)/delta;
      enter=Math.max(enter,Math.min(a,b));
      exit=Math.min(exit,Math.max(a,b));
      if(enter>exit)return null;
    }
    return enter;
  }
  const x=fromX-enemy.sprite.x, y=fromY-enemy.sprite.y;
  const radius=shape.radiusPixels+projectileRadius;
  const c=x*x+y*y-radius*radius;
  if(c<=0)return 0;
  const lengthSq=dx*dx+dy*dy;
  if(!lengthSq)return null;
  const b=2*(x*dx+y*dy), disc=b*b-4*lengthSq*c;
  if(disc<0)return null;
  const t=(-b-Math.sqrt(disc))/(2*lengthSq);
  return t>=0&&t<=1?t:null;
}
