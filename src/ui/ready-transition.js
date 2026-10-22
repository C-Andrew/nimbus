const exits = new Set();

export function nearestExit(rect, width, height) {
  const centerX=(rect.left+rect.right)/2;
  const centerY=(rect.top+rect.bottom)/2;
  const edges = [
    { distance: centerX, x: -rect.right - 16, y: 0 },
    { distance: width - centerX, x: width - rect.left + 16, y: 0 },
    { distance: centerY, x: 0, y: -rect.bottom - 16 },
    { distance: height - centerY, x: 0, y: height - rect.top + 16 },
  ];
  return edges.reduce((best, edge) => edge.distance < best.distance ? edge : best);
}

export function cancelReadyExit() {
  for (const cancel of [...exits]) cancel();
}

export function animateReadyExit(ui) {
  if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const header = document.querySelector('header');
  const elements = [header, ui.gameState, ui.saveStatus, ui.infoButton, ui.playEntry];
  for (const element of elements) {
    if (!element?.animate || element.hidden) continue;
    const visibleElement = element === header ? header.querySelector('.brand') : element === ui.playEntry ? ui.playButton : element;
    const rect = visibleElement.getBoundingClientRect();
    const exit = nearestExit(rect, window.innerWidth, window.innerHeight);
    if (element === ui.playEntry && exit.y > 0) exit.y = element.getBoundingClientRect().height + 16;
    const display = getComputedStyle(element).display;
    const previousInert = element.inert;
    element.inert = true;
    element.style.setProperty('display', display, 'important');
    element.style.setProperty('pointer-events', 'none', 'important');
    const animation = element.animate([
      { transform: 'translate(0, 0)' },
      { transform: `translate(${exit.x}px, ${exit.y}px)` },
    ], { duration: 280, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    const cleanup = () => {
      exits.delete(cleanup);
      animation.onfinish = null;
      animation.cancel();
      element.style.removeProperty('display');
      element.style.removeProperty('pointer-events');
      element.inert = previousInert;
    };
    exits.add(cleanup);
    animation.onfinish = cleanup;
  }
}

/** Only the pause overlay moves; the shared gameplay HUD and Resume control stay fixed. */
export function animatePauseUi(ui, entering) {
  if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const element of [ui.pauseActions]) {
    if (!element?.animate || element.hidden) continue;
    const rect=element.getBoundingClientRect();
    const top=`translateY(${-rect.bottom-16}px)`;
    const display=getComputedStyle(element).display;
    const inert=element.inert;
    element.style.setProperty('display',display,'important');
    if(!entering)element.inert=true;
    const animation=element.animate([
      {transform:entering?top:'translateY(0)'},
      {transform:entering?'translateY(0)':top},
    ],{duration:280,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
    const cleanup=()=>{
      exits.delete(cleanup);
      animation.onfinish=null;
      animation.cancel();
      element.style.removeProperty('display');
      element.inert=inert;
    };
    exits.add(cleanup);
    animation.onfinish=cleanup;
  }
}

function animateUiElement(element, offset, entering) {
  if (!element?.animate || element.hidden) return;
  const display=getComputedStyle(element).display;
  const inert=element.inert;
  element.style.setProperty('display',display,'important');
  if(!entering)element.inert=true;
  const shifted=`translate(${offset.x}px,${offset.y}px)`;
  const animation=element.animate([
    {transform:entering?shifted:'translate(0,0)'},
    {transform:entering?'translate(0,0)':shifted},
  ],{duration:280,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
  const cleanup=()=>{
    exits.delete(cleanup);
    animation.onfinish=null;
    animation.cancel();
    element.style.removeProperty('display');
    element.inert=inert;
  };
  exits.add(cleanup);
  animation.onfinish=cleanup;
}
const motionAllowed=()=>typeof window!=='undefined'&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function animateRestartDeparture(ui, previous) {
  if(!motionAllowed())return;
  const element=previous==='Paused'?ui.pauseActions:ui.restartScreen;
  if(element.hidden)return;
  animateUiElement(element,{x:0,y:-element.getBoundingClientRect().bottom-16},false);
}

export function animateRestartEntry(ui) {
  if(!motionAllowed())return;
  animateUiElement(ui.restartScreen,{x:0,y:window.innerHeight-ui.restartScreen.getBoundingClientRect().top+16},true);
}

export function animateReadyEntry(ui) {
  if(!motionAllowed())return;
  const header=document.querySelector('header');
  for(const element of [header,ui.gameState,ui.saveStatus,ui.infoButton,ui.playEntry]) {
    const visible=element===header?header.querySelector('.brand'):element===ui.playEntry?ui.playButton:element;
    if(!element?.getBoundingClientRect)continue;
    const offset=nearestExit(visible.getBoundingClientRect(),window.innerWidth,window.innerHeight);
    if(element===ui.playEntry&&offset.y>0)offset.y=element.getBoundingClientRect().height+16;
    animateUiElement(element,offset,true);
  }
}
