import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rectify, enhance, validCorners } from './scan-core.js';

test('perspective correction maps all four output corners to source corners', () => {
  const data = new Uint8ClampedArray(100*100*4);
  for(let y=0;y<100;y++) for(let x=0;x<100;x++) data.set([x,y,30,255],(y*100+x)*4);
  const points=[{x:20,y:10},{x:80,y:20},{x:90,y:90},{x:10,y:80}];
  const output=rectify({width:100,height:100,data},points);
  const offsets=[0,(output.width-1)*4,(output.width*output.height-1)*4,(output.height-1)*output.width*4];
  offsets.forEach((offset,i)=>{assert.equal(output.data[offset],points[i].x);assert.equal(output.data[offset+1],points[i].y);});
  assert.ok(!validCorners([points[0],points[2],points[1],points[3]]));
  assert.throws(()=>rectify({width:100,height:100,data},[points[0],points[2],points[1],points[3]]));
});

test('adaptive threshold keeps dark text on both bright and shaded paper', () => {
  const width=100,height=100,data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
    const value=(x===25 || x===75) && y>20 && y<80 ? 25 : x<50 ? 130 : 245;
    data.set([value,value,value,255],(y*width+x)*4);
  }
  const image={data,width,height}, output=enhance(image,'bw');
  for(const x of [25,75]) assert.equal(output.data[(50*width+x)*4],0);
  for(const x of [15,85]) assert.equal(output.data[(50*width+x)*4],255);
  assert.deepEqual(enhance(image,'color').data,data);
  assert.equal(image.data[(50*width+15)*4],130);
});
