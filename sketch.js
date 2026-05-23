let table;
let s_zoom, s_scale, s_variance, s_spread, s_height, s_steer, s_torsoSplit, s_armSplit, s_move, s_loudExp, s_bpmScale, s_complexity, s_gravity;
let l_zoom, l_scale, l_variance, l_spread, l_height, l_steer, l_torsoSplit, l_armSplit, l_move, l_loudExp, l_bpmScale, l_complexity, l_gravity, l_syncTrack;

let uiElements = [];

// --- SUSPENSION PHYSICS SYSTEM VARIABLES ---
let physY = 0;         
let physVy = 0;        
let squashFactor = 1.0; 

// --- TEMPORAL CLOCK SYSTEM VARIABLES ---
let rowTimeScores = [];      
let timeMatchedSong = "None"; 

function preload() {
  // Configured natively for your specific uploaded file
  table = loadTable('music5.csv', 'csv', 'header');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(displayDensity()); // High-DPI screen optimization
  
  let startX = 30, startY = 30, gap = 52; 
  
  // --- ALL YOUR REVISED DEFAULTS CHOSEN APPLIED ---
  l_zoom = createP('').position(startX, startY - 15);
  s_zoom = createSlider(0.1, 10.0, 1.0, 0.05).position(startX, startY + 15); // UPDATED DEFAULT: 1.00x
  
  l_scale = createP('').position(startX, startY + gap - 15);
  s_scale = createSlider(0.01, 5.0, 0.56, 0.01).position(startX, startY + gap + 15);
  
  l_variance = createP('').position(startX, startY + gap * 2 - 15);
  s_variance = createSlider(0.0, 10.0, 3.3, 0.1).position(startX, startY + gap * 2 + 15);
  
  l_spread = createP('').position(startX, startY + gap * 3 - 15);
  s_spread = createSlider(10, 1000, 310, 10).position(startX, startY + gap * 3 + 15);
  
  l_height = createP('').position(startX, startY + gap * 4 - 15);
  s_height = createSlider(100, 3000, 1400, 10).position(startX, startY + gap * 4 + 15); // UPDATED DEFAULT: 1400
  
  l_steer = createP('').position(startX, startY + gap * 5 - 15);
  s_steer = createSlider(0, 10, 2.9, 0.1).position(startX, startY + gap * 5 + 15);
  
  l_torsoSplit = createP('').position(startX, startY + gap * 6 - 15);
  s_torsoSplit = createSlider(0.01, 0.8, 0.06, 0.01).position(startX, startY + gap * 6 + 15);

  l_armSplit = createP('').position(startX, startY + gap * 7 - 15);
  s_armSplit = createSlider(0.01, 0.9, 0.10, 0.01).position(startX, startY + gap * 7 + 15);

  l_move = createP('').position(startX, startY + gap * 8 - 15);
  s_move = createSlider(0, 5, 1.8, 0.1).position(startX, startY + gap * 8 + 15);

  l_loudExp = createP('').position(startX, startY + gap * 9 - 15);
  s_loudExp = createSlider(0.1, 10.0, 1.0, 0.1).position(startX, startY + gap * 9 + 15);

  l_bpmScale = createP('').position(startX, startY + gap * 10 - 15);
  s_bpmScale = createSlider(0.1, 10.0, 1.0, 0.1).position(startX, startY + gap * 10 + 15);

  l_complexity = createP('').position(startX, startY + gap * 11 - 15);
  s_complexity = createSlider(0, 1.0, 0.96, 0.01).position(startX, startY + gap * 11 + 15);

  l_gravity = createP('').position(startX, startY + gap * 12 - 15);
  s_gravity = createSlider(0.0, 5.0, 1.5, 0.1).position(startX, startY + gap * 12 + 15);

  l_syncTrack = createP('').position(startX, startY + gap * 13 - 15);

  uiElements = [
    l_zoom, s_zoom, l_scale, s_scale, l_variance, s_variance,
    l_spread, s_spread, l_height, s_height, l_steer, s_steer,
    l_torsoSplit, s_torsoSplit, l_armSplit, s_armSplit,
    l_move, s_move, l_loudExp, s_loudExp, l_bpmScale, s_bpmScale,
    l_complexity, s_complexity, l_gravity, s_gravity, l_syncTrack
  ];

  // --- PRE-COMPUTE TIME SCORING MATRIX ---
  let rows = table.getRows();
  for (let i = 0; i < rows.length; i++) {
    let rawDateStr = rows[i].get('Added At') || rows[i].get('Timestamp') || rows[i].get('Date') || "";
    let parsedDate = new Date(rawDateStr);
    
    if (!isNaN(parsedDate.getTime())) {
      let timeScore = parsedDate.getMonth() * 44640 + parsedDate.getDate() * 1440 + parsedDate.getHours() * 60 + parsedDate.getMinutes();
      rowTimeScores.push(timeScore);
    } else {
      rowTimeScores.push(-1); 
    }
  }

  // Spawns up high so it falls and lands smoothly onto its shock absorbers
  physY = -200; 
  physVy = 0;
}

function draw() {
  background(255);
  
  let zoomVal = s_zoom.value();
  let time = millis() / 1000;
  let rows = table.getRows();
  let baseMoveInt = s_move.value();
  let baseLoudExp = s_loudExp.value();
  let gravForce = s_gravity.value();
  let floorLine = s_height.value();
  let centerX = width / 2;

  // --- 1. LIVE CLOCK LOOKUP ALGORITHM ---
  let currentSystemScore = (month() - 1) * 44640 + day() * 1440 + hour() * 60 + minute();
  let closestIndex = 0;
  let minimumDelta = Infinity;

  for (let i = 0; i < rows.length; i++) {
    if (rowTimeScores[i] === -1) continue;
    let delta = abs(rowTimeScores[i] - currentSystemScore);
    if (delta < minimumDelta) {
      minimumDelta = delta;
      closestIndex = i;
    }
  }

  // --- 2. MODULATE VALUES BASED ON NEAREST TIME TRACK ---
  let temporalTrack = rows[closestIndex];
  timeMatchedSong = temporalTrack ? (temporalTrack.get('Track Name') || "Row #" + closestIndex) : "None";
  
  let timeEnergy = temporalTrack ? (float(temporalTrack.get('Energy')) || 0.5) : 0.5;
  let timeLoudness = temporalTrack ? (abs(float(temporalTrack.get('Loudness'))) || 10) : 10;

  let moveInt = baseMoveInt * timeEnergy * 1.5; 
  let loudExp = baseLoudExp * map(timeLoudness, 20, 0, 0.5, 2.0, true);

  if (!fullscreen()) {
    updateLabels(moveInt, loudExp);
  }

  let s = calculateRelativeSkeleton(rows);

  // PREVIEW LIVE SKELETAL EXTENSION HEIGHT
  let leftLowest = getLowestLegPoint(s.leftLegChunks, time, moveInt, loudExp);
  let rightLowest = getLowestLegPoint(s.rightLegChunks, time, moveInt, loudExp);
  let maxLegExtension = max(leftLowest, rightLowest);

  let targetHipY = floorLine - maxLegExtension;

  // --- 3. SUSPENSION SPRING MECHANICS PIPELINE ---
  if (physY < targetHipY) {
    physVy += gravForce * 0.5; 
    physY += physVy;
    squashFactor = 1.0; 
  } else {
    let displacement = physY - targetHipY;
    let springForce = -0.22 * displacement; 
    
    physVy += springForce + (gravForce * 0.5); 
    physVy *= 0.84; 
    physY += physVy;

    squashFactor = (floorLine - physY) / maxLegExtension;
    squashFactor = constrain(squashFactor, 0.1, 1.0);
  }

  // --- 4. ENGINE PRESENTATION MATRIX ---
  push();
  translate(centerX, height / 2);
  scale(zoomVal);
  translate(-centerX, -height / 2);

  noFill(); stroke(0); strokeWeight(1.5 / zoomVal); 
  strokeJoin(ROUND); strokeCap(ROUND);

  let groundMotor = rows[s.meetingIdx];
  let rootOsc = getOsc(groundMotor, time, moveInt, 0, loudExp, 1.0);

  push();
  translate(centerX, physY);
  rotate(rootOsc);
  
  let staticHipOffset = s.hipPos.y - s.bY;

  // DRAW LEGS (Correct downward orientation)
  push();
  translate(0, staticHipOffset * squashFactor);
  scale(1, squashFactor);
  drawNestedChain({x:0, y:0}, s.leftLegChunks, time, moveInt, loudExp);
  drawNestedChain({x:0, y:0}, s.rightLegChunks, time, moveInt, loudExp);
  pop();

  // DRAW UPPER BODY
  push();
  translate(0, staticHipOffset * squashFactor);
  for (let chunk of s.torsoChunks) {
    let osc = getOsc(chunk.motorRow, time, moveInt, chunk.phase, loudExp, chunk.interference);
    rotate(osc);
    beginShape();
    for (let p of chunk.relPath) vertex(p.x, p.y);
    endShape();
    let end = chunk.relPath[chunk.relPath.length - 1];
    translate(end.x, end.y);
  }
  
  drawNestedChain({x:0, y:0}, s.leftArmChunks, time, moveInt, loudExp);
  drawNestedChain({x:0, y:0}, s.rightArmChunks, time, moveInt, loudExp);
  drawNestedChain({x:0, y:0}, s.neckChunks, time, moveInt, loudExp);
  
  pop(); 
  pop(); 
  pop(); 
}

function keyPressed() {
  if (key === ' ') {
    let floorLine = s_height.value();
    let leftLowest = getLowestLegPoint(calculateRelativeSkeleton(table.getRows()).leftLegChunks, millis()/1000, s_move.value(), s_loudExp.value());
    let rightLowest = getLowestLegPoint(calculateRelativeSkeleton(table.getRows()).rightLegChunks, millis()/1000, s_move.value(), s_loudExp.value());
    let maxLegExtension = max(leftLowest, rightLowest);
    let targetHipY = floorLine - maxLegExtension;

    if (physY >= targetHipY - 15) {
      physVy = -25; 
    }
  }
}

function getLowestLegPoint(chunks, t, intensity, loudExp) {
  let maxY = 0, currentY = 0, accumulatedRotation = 0;
  for (let chunk of chunks) {
    let osc = getOsc(chunk.motorRow, t, intensity, chunk.phase, loudExp, chunk.interference);
    accumulatedRotation += osc;
    for (let p of chunk.relPath) {
      let ry = p.x * sin(accumulatedRotation) + p.y * cos(accumulatedRotation);
      let absoluteY = currentY + ry;
      if (absoluteY > maxY) maxY = absoluteY;
    }
    let end = chunk.relPath[chunk.relPath.length - 1];
    let ry = end.x * sin(accumulatedRotation) + end.y * cos(accumulatedRotation);
    currentY += ry;
  }
  return maxY;
}

function drawNestedChain(pivot, chunks, t, intensity, loudExp) {
  push();
  translate(pivot.x, pivot.y);
  for (let chunk of chunks) {
    let osc = getOsc(chunk.motorRow, t, intensity, chunk.phase, loudExp, chunk.interference);
    rotate(osc);
    beginShape();
    for (let p of chunk.relPath) vertex(p.x, p.y);
    endShape();
    let end = chunk.relPath[chunk.relPath.length - 1];
    translate(end.x, end.y);
  }
  pop();
}

function getOsc(track, t, intensity, phase, loudExp, interference = 1.0) {
  if (!track || intensity === 0) return 0;
  let bpm = float(track.get('Tempo')) || float(track.get('BPM')) || 120;
  let loud = abs(float(track.get('Loudness'))) || abs(float(track.get('Loud (Db)'))) || 10;
  
  let normLoud = map(loud, 30, 0, 0, 1, true);
  let curvedLoud = pow(normLoud, loudExp);
  let speed = s_bpmScale.value() * interference;
  
  return sin(t * (bpm/60) * speed * TWO_PI + phase) * (curvedLoud * 0.02) * intensity;
}

function calculateRelativeSkeleton(rows) {
  let scale = s_scale.value();
  let variance = s_variance.value();
  let spread = s_spread.value();
  let bY = s_height.value();
  let steerInt = s_steer.value();
  let comp = s_complexity.value();
  let cX = width / 2;

  let lX = cX - spread, lY = bY, rX = cX + spread, rY = bY;
  let leftFull = [{x: lX, y: lY}], rightFull = [{x: rX, y: rY}];
  let hipPos = { x: cX, y: bY }, meetingIdx = rows.length;

  for (let i = 0; i < rows.length; i++) {
    let e = float(rows[i].get('Energy')), d = float(rows[i].get('Track Duration (ms)')), v = float(rows[i].get('Valence'));
    let slen = scale * pow((e * (d/100000)), variance);
    let sangle = (v - 0.5) * steerInt;

    let nX, nY, hit = null;
    if (i % 2 === 0) {
      nX = lX + slen * cos(-PI/4 + sangle); nY = lY + slen * sin(-PI/4 + sangle);
      for (let j = 0; j < rightFull.length - 1; j++) {
        hit = intersect(lX, lY, nX, nY, rightFull[j].x, rightFull[j].y, rightFull[j+1].x, rightFull[j+1].y);
        if (hit) { rightFull = rightFull.slice(0, j+1); rightFull.push(hit); leftFull.push(hit); break; }
      }
      if (!hit) { lX = nX; lY = nY; leftFull.push({x: lX, y: lY}); }
    } else {
      nX = rX + slen * cos(-3*PI/4 + sangle); nY = rY + slen * sin(-3*PI/4 + sangle);
      for (let j = 0; j < leftFull.length - 1; j++) {
        hit = intersect(rX, rY, nX, nY, leftFull[j].x, leftFull[j].y, leftFull[j+1].x, leftFull[j+1].y);
        if (hit) { leftFull = leftFull.slice(0, j+1); leftFull.push(hit); rightFull.push(hit); break; }
      }
      if (!hit) { rX = nX; rY = nY; rightFull.push({x: rX, y: rY}); }
    }
    if (hit || i > 800) { hipPos = hit || {x: (lX+rX)/2, y: (lY+rY)/2}; meetingIdx = i; break; }
  }

  let rem = rows.length - meetingIdx;
  let tEnd = floor(meetingIdx + rem * s_torsoSplit.value());
  let aEnd = floor(tEnd + rem * s_armSplit.value());

  let tPath = generatePath(rows, meetingIdx, tEnd, hipPos, -PI/2, scale, variance, steerInt);
  let laPath = generatePath(rows, tEnd, aEnd, tPath[tPath.length-1], PI*0.8, scale, variance, steerInt, true);
  let raPath = generatePath(rows, tEnd, aEnd, tPath[tPath.length-1], PI*0.2, scale, variance, steerInt, false);
  let nPath = generatePath(rows, aEnd, rows.length, tPath[tPath.length-1], -PI/2, scale, variance, steerInt);

  const toRel = (path, rStart, rEnd, count, rev, limbId) => {
    let chunks = [];
    let p = rev ? [...path].reverse() : [...path];
    let ptsPer = floor(p.length / count);
    for (let i = 0; i < count; i++) {
      let sIdx = i * ptsPer, eIdx = (i === count-1) ? p.length : (i+1)*ptsPer;
      if (sIdx >= p.length) break;
      let sub = p.slice(sIdx, eIdx);
      let origin = sub[0];
      let relPath = sub.map(pt => ({x: pt.x - origin.x, y: pt.y - origin.y}));
      let motorRow = rows[constrain(rStart + floor((rEnd-rStart)/count)*i, 0, rows.length-1)];
      let interference = 1.0 + ((i + limbId * 0.73) % 1.0 - 0.5) * comp; 
      chunks.push({ relPath, motorRow, phase: i * PI/6, interference });
    }
    return chunks;
  };

  return {
    bY, hipPos, meetingIdx,
    leftLegChunks: toRel(leftFull, 0, meetingIdx, 8, true, 1),
    rightLegChunks: toRel(rightFull, 0, meetingIdx, 8, true, 2),
    torsoChunks: toRel(tPath, meetingIdx, tEnd, 8, false, 3),
    leftArmChunks: toRel(laPath, tEnd, aEnd, 6, false, 4),
    rightArmChunks: toRel(raPath, tEnd, aEnd, 6, false, 5),
    neckChunks: toRel(nPath, aEnd, rows.length, 4, false, 6)
  };
}

function generatePath(rows, start, end, origin, baseAngle, scale, variance, steer, isInt) {
  let currX = origin.x, currY = origin.y, path = [{x: currX, y: currY}];
  for (let i = start; i < end; i++) {
    if (isInt !== undefined && ((isInt && i % 2 !== 0) || (!isInt && i % 2 === 0))) continue;
    let e = float(rows[i].get('Energy')), d = float(rows[i].get('Track Duration (ms)')), v = float(rows[i].get('Valence'));
    let slen = scale * pow((e * (d/100000)), variance);
    currX += slen * cos(baseAngle + (v - 0.5) * steer);
    currY += slen * sin(baseAngle + (v - 0.5) * steer);
    path.push({x: currX, y: currY});
  }
  return path;
}

function updateLabels(modMove, modLoud) {
  l_zoom.html("<b>Camera Zoom:</b> " + nfc(s_zoom.value(), 2) + "x");
  l_scale.html("<b>Base Step Scale:</b> " + s_scale.value());
  l_variance.html("<b>Data Step Variance:</b> " + s_variance.value());
  l_spread.html("<b>Leg Spread:</b> " + s_spread.value());
  l_height.html("<b>Floor Elevation Line:</b> " + s_height.value());
  l_steer.html("<b>Steer Intensity:</b> " + s_steer.value());
  l_torsoSplit.html("<b>Torso Length:</b> " + nfc(s_torsoSplit.value() * 100, 1) + "%");
  l_armSplit.html("<b>Arm Length:</b> " + nfc(s_armSplit.value() * 100, 1) + "%");
  
  l_move.html("<b>Motion Intensity:</b> " + s_move.value() + " (Live: " + nfc(modMove, 2) + ")");
  l_loudExp.html("<b>Loudness Contrast:</b> " + s_loudExp.value() + " (Live: " + nfc(modLoud, 2) + ")");
  
  l_bpmScale.html("<b>BPM Multiplier:</b> " + s_bpmScale.value() + "x");
  l_complexity.html("<b>Rhythmic Drift:</b> " + nfc(s_complexity.value() * 100, 0) + "%");
  l_gravity.html("<b>Gravity Force Acceleration:</b> " + s_gravity.value());
  
  l_syncTrack.html("<b>Clock Sync Track:</b> <br><span style='color:#1DB954; font-weight:bold;'>" + timeMatchedSong + "</span>");
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  for (let element of uiElements) {
    if (fullscreen()) element.hide();
    else element.show();
  }
}

function mousePressed() {
  if (fullscreen() || mouseX > 250) {
    let fs = fullscreen();
    fullscreen(!fs);
  }
}

function intersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  let den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (den == 0) return null;
  let t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
  let u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
  return null;
}
