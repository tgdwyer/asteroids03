import { fromEvent,interval } from 'rxjs'; 
import { map,filter,flatMap,merge,scan, takeUntil } from 'rxjs/operators';

const 
  CanvasSize = 200,
  torusWrap = ({x,y}:Vec) => { 
    const wrap = (v:number) => 
      v < 0 ? v + CanvasSize : v > CanvasSize ? v - CanvasSize : v;
    return new Vec(wrap(x),wrap(y))
  };
  
type Key = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp'
type Event = 'keydown' | 'keyup'

function asteroids() {
  class Tick { constructor(public readonly elapsed:number) {} }
  class Rotate { constructor(public readonly direction:number) {} }
  class Thrust { constructor(public readonly on:boolean) {} }
  
  const keyObservable = <T>(e:Event, k:Key, result:()=>T)=>
    fromEvent<KeyboardEvent>(document,e)
        .pipe(
          filter(({key})=>key === k),
          filter(({repeat})=>!repeat),
          map(result)),
    startLeftRotate = keyObservable('keydown','ArrowLeft',()=>new Rotate(-.1)),
    startRightRotate = keyObservable('keydown','ArrowRight',()=>new Rotate(.1)),
    stopLeftRotate = keyObservable('keyup','ArrowLeft',()=>new Rotate(0)),
    stopRightRotate = keyObservable('keyup','ArrowRight',()=>new Rotate(0)),
    startThrust = keyObservable('keydown','ArrowUp', ()=>new Thrust(true)),
    stopThrust = keyObservable('keyup','ArrowUp', ()=>new Thrust(false))

  type State = Readonly<{
    pos:Vec, 
    vel:Vec,
    acc:Vec,
    angle:number,
    rotation:number,
    torque:number
  }>
  
  const initialState:State = {
      pos: new Vec(CanvasSize/2,CanvasSize/2), 
      vel: Vec.Zero, 
      acc: Vec.Zero, 
      angle:0,
      rotation:0,
      torque:0
  }
  const     
    reduceState = (s:State, e:Rotate|Thrust|Tick)=>
        e instanceof Rotate ? {...s,
      torque:e.direction
    } :
    e instanceof Thrust ? {...s,
      acc:e.on?Vec.unitVecInDirection(s.angle).scale(0.05):Vec.Zero
    } : {...s,
      rotation: s.rotation+s.torque,
      angle:s.angle+s.rotation,
      pos: torusWrap(s.pos.add(s.vel)),
      vel:s.vel.add(s.acc)
    };
  interval(10)
    .pipe(
      map(elapsed=>new Tick(elapsed)),
      merge(
        startLeftRotate,startRightRotate,stopLeftRotate,stopRightRotate),
      merge(startThrust,stopThrust),
      scan(reduceState, initialState)
    ).subscribe(updateView);

  function updateView(s: State) {
    const 
      ship = document.getElementById("ship")!,
      show = (id:string,condition:boolean)=>((e:HTMLElement) => 
        condition ? e.classList.remove('hidden')
                  : e.classList.add('hidden'))(document.getElementById(id)!);
    show("leftThrust",  s.torque<0);
    show("rightThrust", s.torque>0);
    show("thruster",    s.acc.len()>0); 
    ship.setAttribute('transform', `translate(${s.pos.x},${s.pos.y}) rotate(${s.angle})`);
  }
} 
function asteroidsObservable1() {
  const 
    ship = document.getElementById("ship")!,
    state = {
      x:100, y:100, angle:0
  }
  fromEvent<KeyboardEvent>(document, 'keydown').pipe(
    filter(({key})=>key === 'ArrowLeft' || key === 'ArrowRight'),
    filter(({repeat})=>!repeat),
    flatMap(d=>interval(10).pipe(
      takeUntil(fromEvent<KeyboardEvent>(document, 'keyup').pipe(
        filter(({key})=>key === d.key)
      )),
      map(_=>d))
    ),
    map(d=>d.key==='ArrowLeft'?-1:1))
    .subscribe(a=>
      ship.setAttribute('transform',
       `translate(${state.x},${state.y}) rotate(${state.angle+=a})`)
  )
}

//window.onload = asteroids;
setTimeout(asteroids, 0)

function asteroidsEvents() {
  const ship = document.getElementById("ship")!;
  const state = {
      x:100, y:100, angle:0
  }
  document.onkeydown = function(e:KeyboardEvent) {
    if((e.key === "ArrowLeft" || e.key === "ArrowRight") && !e.repeat) {
      const handle = setInterval(function(){
        ship.setAttribute('transform',
          `translate(${state.x},${state.y}) rotate(${state.angle+=e.key === "ArrowLeft" ? -1 : 1})`)
        },10);
      const keyupListener = (u:KeyboardEvent)=>{
        if(u.key === e.key) {
          clearInterval(handle);
          document.removeEventListener('keyup',keyupListener);
        }
      };
      document.addEventListener("keyup",keyupListener);
    }
  }
}
//window.onload = asteroidsEvents;
//setTimeout(asteroidsEvents, 0)
//window.onload = asteroids

function showKeys() {
  function showKey(k:Key) {
    const arrowKey = document.getElementById(k)!,
      o = (e:Event) => fromEvent<KeyboardEvent>(document,e).pipe(filter(({key})=>key === k))
    o('keydown').subscribe(_=>arrowKey.classList.add("highlight"))
    o('keyup').subscribe(_=>arrowKey.classList.remove("highlight"))
  }
  showKey('ArrowLeft');
  showKey('ArrowRight');
  showKey('ArrowUp');
}

setTimeout(showKeys, 0)

class Vec {
  constructor(public readonly x: number = 0, public readonly y: number = 0) {}
  add = (b:Vec) => new Vec(this.x + b.x, this.y + b.y)
  sub = (b:Vec) => this.add(b.scale(-1))
  len = ()=> Math.sqrt(this.x*this.x + this.y*this.y)
  scale = (s:number) => new Vec(this.x*s,this.y*s)
  ortho = ()=> new Vec(this.y,-this.x)
  rotate = (deg:number) =>
            (rad =>(
                (cos,sin,{x,y})=>new Vec(x*cos - y*sin, x*sin + y*cos)
              )(Math.cos(rad), Math.sin(rad), this)
            )(Math.PI * deg / 180)

  static unitVecInDirection = (deg: number) => new Vec(0,-1).rotate(deg)
  static Zero = new Vec();
}