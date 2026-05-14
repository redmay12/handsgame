const animals = [
  "사랑스런 너구리", "몽글몽글 강아지", "초롱초롱 햄스터", "수줍은 아기사슴", "졸린 눈 코알라", 
  "웃음 부자 쿼카", "수다쟁이 앵무새", "느릿느릿 나무늘보", "하마", "하품하는 하마", 
  "커다란 고래", "솜사탕 양", "어흥 아기호랑이", "노래하는 카나리아", "숲속의 고라니", 
  "부끄럼쟁이 두더지", "반짝반짝 반딧불이", "점박이 강아지", "깜찍한 다람쥐", "애교쟁이 고양이", 
  "포근한 판다", "뒤뚱뒤뚱 펭귄", "보들보들 토끼", "삐약삐약 병아리", "말랑말랑 해파리", 
  "꼬리 살랑 사막여우", "밤송이 고슴도치", "빼꼼 미어캣", "장난꾸러기 수달", "하얀 눈 북극곰", 
  "매끈매끈 물개", "보들보들 알파카", "목이 긴 기린", "대장 코끼리", "튼튼한 물소", 
  "점프쟁이 돌고래", "춤추는 해마", "엉금엉금 거북이", "아기 꿀돼지", "똑똑한 원숭이", 
  "멋쟁이 얼룩말", "아기 코뿔소", "몽실몽실 비숑", "파닥파닥 나비", "무지개 앵무새", 
  "씩씩한 아기사자", "알록달록 카멜레온", "깡충깡충 캥거루", "날씬한 치타", "꿀잠 자는 생쥐", "용감한 독수리"
];

let video, predictions = [];
let ball, gameState = "START"; 
let lives = 3, timer = 60, countdown = 3; 
let lastTime, countdownStartTime;
let speedLevel = 1, selectedAnimal = "";
let survivalTime = 0; 
let inputField, nextAnimalBtn, speedBtn, startBtn;
let bgm, hitSound, failSound;
let prevHandY = [0, 0];
let particles = []; 
let userName = ""; 

// 0~20 랜드마크 전체 사용 (손바닥+손가락 모두)
const allPoints = Array.from({length: 21}, (_, i) => i);
const ballColorHex = "#FFD700"; 

function preload() {
  bgm = loadSound('bgm.mp3');
  hitSound = loadSound('hit.mp3');
  failSound = loadSound('fail.mp3');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  // MediaPipe Hands — 양손(maxNumHands: 2)
  const hands = new Hands({
    locateFile: (file) => file
  });
  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.6
  });
  hands.onResults((results) => {
    predictions = [];
    if (!results.multiHandLandmarks) return;
    results.multiHandLandmarks.forEach((landmarks) => {
      const converted = landmarks.map(lm => [lm.x * 640, lm.y * 480, lm.z]);
      predictions.push({ landmarks: converted });
    });
  });

  const camera = new Camera(video.elt, {
    onFrame: async () => { await hands.send({ image: video.elt }); },
    width: 640,
    height: 480
  });
  camera.start();

  ball = new Ball();

  inputField = createInput('');
  inputField.attribute('placeholder', '이름입력 또는 별명선택');
  styleElement(inputField);

  nextAnimalBtn = createButton('별명 바꾸기');
  speedBtn = createButton(`난이도: ${speedLevel}단계`);
  startBtn = createButton('게임 시작');

  styleButton(nextAnimalBtn, "#D1EAFF");
  styleButton(speedBtn, "#FFD1DC");
  styleButton(startBtn, "#E0D1FF");

  nextAnimalBtn.mousePressed(() => {
    selectedAnimal = random(animals);
    inputField.value(selectedAnimal);
  });

  speedBtn.mousePressed(() => {
    speedLevel = (speedLevel % 3) + 1;
    speedBtn.html(`난이도: ${speedLevel}단계`);
  });

  startBtn.mousePressed(() => {
    userName = inputField.value().trim() || "통통이"; 
    gameState = "COUNTDOWN";
    countdown = 3;
    countdownStartTime = millis();
    hideUI();
    if (getAudioContext().state !== 'running') userStartAudio();
  });

  updateUIPositions();
}

function updateUIPositions() {
  inputField.size(300, 45);
  inputField.position(width / 2 - 150, height / 2 + 10);
  nextAnimalBtn.position(width / 2 - 300, height / 2 + 120);
  speedBtn.position(width / 2 - 95, height / 2 + 120);
  startBtn.position(width / 2 + 110, height / 2 + 120);
}

function styleButton(btn, bgColor) {
  btn.size(190, 65);
  btn.style('background-color', bgColor);
  btn.style('border', 'none');
  btn.style('border-radius', '20px');
  btn.style('font-family', "'Do Hyeon', sans-serif");
  btn.style('font-size', '22px');
  btn.style('cursor', 'pointer');
}

function styleElement(el) {
  el.style('border', '2px solid #ddd');
  el.style('border-radius', '12px');
  el.style('font-family', "'Do Hyeon', sans-serif");
  el.style('font-size', '20px');
  el.style('text-align', 'center');
}

function hideUI() { inputField.hide(); nextAnimalBtn.hide(); speedBtn.hide(); startBtn.hide(); }
function showUI() { inputField.show(); nextAnimalBtn.show(); speedBtn.show(); startBtn.show(); }

function draw() {
  background(255);
  push();
  translate(width, 0); scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();
  
  if (gameState !== "PLAY") background(255, 220);
  textFont('Do Hyeon');
  
  if (gameState === "START") drawStartScreen();
  else if (gameState === "COUNTDOWN") drawCountdown();
  else if (gameState === "PLAY") playGame();
  else if (gameState === "GAMEOVER") drawGameOver();
}

function drawStartScreen() {
  textAlign(CENTER); fill(50); textSize(width * 0.08);
  text("도전!핸즈업", width / 2, height / 2 - 180);
  fill(80); textSize(24);
  text("1분 동안 공을 떨어트리지 않고 튕겨보아요.", width / 2, height / 2 - 90);
  text("준비되었으면 도전!핸즈업", width / 2, height / 2 - 50);
  drawSource(); 
}

function drawSource() {
  push(); textAlign(RIGHT); textSize(12); fill(150);
  text("음원출처: https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?wrtSn=13312665&menuNo=200026", width - 30, height - 30);
  pop();
}

function drawCountdown() {
  let elapsed = (millis() - countdownStartTime) / 1000;
  let currentCount = ceil(3 - elapsed);

  textAlign(CENTER); fill(255, 100, 100); textSize(300);
  text(max(currentCount, 1), width / 2, height / 2 + 30);

  if (elapsed >= 3) {
    gameState = "PLAY";
    lastTime = millis();
    if (bgm.isLoaded()) bgm.loop();
    ball.reset();
  }
}

function playGame() {
  let elapsed = (millis() - lastTime) / 1000;
  survivalTime = elapsed;
  timer = max(0, 60 - elapsed);
  
  if (elapsed >= 60) { survivalTime = 60; endGame(); return; }

  drawGameUI();
  ball.update();
  ball.display();

  if (predictions.length > 0) {
    predictions.forEach((prediction, i) => {
      let hand = prediction.landmarks;
      if (prevHandY[i] === undefined) prevHandY[i] = 0;

      let currentHandY = hand[8][1];
      let handSpeedY = prevHandY[i] - currentHandY;

      for (let index of allPoints) {
        let x = map(hand[index][0], 0, 640, width, 0);
        let y = map(hand[index][1], 0, 480, 0, height);
        
        // 손가락 끝은 크게, 관절·손바닥은 작게
        let dotSize = [4,8,12,16,20].includes(index) ? 16 : 9;
        fill(i === 0 ? color(255, 80, 80, 180) : color(80, 80, 255, 180));
        noStroke(); 
        ellipse(x, y, dotSize);

        if (dist(x, y, ball.x, ball.y) < ball.r + 20 && ball.vy > 0) {
          ball.bounce((ball.x - x) * 0.25, constrain(handSpeedY * 0.6, 6, 16));
          if (hitSound.isLoaded()) hitSound.play();
        }
      }

      prevHandY[i] = currentHandY;
    });
  }

  if (ball.y > height + ball.r && !ball.isResetting) {
    ball.isResetting = true;
    if (failSound.isLoaded()) failSound.play();
    lives--;
    if (lives <= 0) endGame();
    else setTimeout(() => { ball.reset(); ball.isResetting = false; }, 1000);
  }
}

function drawGameUI() {
  let pW = width * 0.9; let pH = 80;
  let pX = (width - pW) / 2; let pY = 20;
  fill(255, 245); stroke(220); strokeWeight(2);
  rect(pX, pY, pW, pH, 40);
  let cY = pY + pH / 2;
  
  noStroke(); fill(50); textAlign(LEFT, CENTER); textSize(26);
  text(`힘내세요! ${userName}`, pX + 40, cY);

  let bW = pW * 0.4; let bX = width / 2 - bW / 2; let bH = 35;
  fill(230); rect(bX, cY - bH / 2, bW, bH, 15);
  fill(timer > 15 ? color(100, 200, 100) : color(255, 100, 100));
  rect(bX, cY - bH / 2, map(max(timer, 0), 0, 60, 0, bW), bH, 15);
  fill(255); textAlign(CENTER, CENTER); textSize(18);
  text(ceil(timer) + "s", width / 2, cY);

  for (let i = 0; i < lives; i++) {
    let x = (pX + pW - 60) - (i * 45);
    drawMiniBall(x, cY, 15, ballColorHex);
  }
}

function drawMiniBall(x, y, r, c) {
  push(); noStroke(); fill(c); ellipse(x, y, r * 2);
  fill(255, 200); ellipse(x - r * 0.3, y - r * 0.3, r * 0.6); pop();
}

function endGame() {
  gameState = "GAMEOVER";
  if (bgm.isLoaded()) bgm.stop();
  if (survivalTime >= 60) {
    for (let i = 0; i < 150; i++) particles.push(new Particle(width / 2, height / 2));
  }
}

function drawGameOver() {
  textAlign(CENTER, CENTER);
  let mainMsg = ""; let subMsg = "";
  let displayTime = floor(survivalTime);
  
  if (survivalTime >= 60) {
    mainMsg = "최고예요!";
    subMsg = "집중력이 정말 놀라워요. 공튕기기 박사님이시네요!";
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update(); particles[i].display();
      if (particles[i].finished()) particles.splice(i, 1);
    }
  } else if (survivalTime >= 40) {
    mainMsg = "와! 실력이 대단한걸요?";
    subMsg = "조금만 더 집중하면 1분도 문제없어요!";
  } else if (survivalTime >= 20) {
    mainMsg = "참 잘했어요!";
    subMsg = "정말 멋지게 해냈어요!";
  } else {
    mainMsg = "괜찮아요!";
    subMsg = "다시 한번 도전해 볼까요? 공을 끝까지 바라봐요!";
  }

  fill(255, 100, 100); textSize(width * 0.08);
  text(mainMsg, width / 2, height / 2 - 40);
  fill(80); textSize(width * 0.03);
  text(subMsg, width / 2, height / 2 + 60);
  textSize(20); fill(150);
  text(`${userName}님, ${displayTime}초 동안 버텼어요!`, width / 2, height / 2 + 120);
  text("화면을 클릭하면 다시 시작!", width / 2, height - 80);
  drawSource();
}

function mousePressed() {
  if (gameState === "GAMEOVER") {
    lives = 3; timer = 60; countdown = 3; survivalTime = 0;
    prevHandY = [0, 0];
    particles = []; gameState = "START"; showUI();
  }
}

class Particle {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = random(-10, 10); this.vy = random(-15, 5);
    this.alpha = 255;
    this.color = color(random(255), random(255), random(255));
    this.w = random(5, 15); this.h = random(5, 15);
  }
  finished() { return this.alpha < 0; }
  update() { this.x += this.vx; this.y += this.vy; this.vy += 0.2; this.alpha -= 2; }
  display() {
    noStroke(); fill(red(this.color), green(this.color), blue(this.color), this.alpha);
    push(); translate(this.x, this.y); rotate(frameCount * 0.1); rect(0, 0, this.w, this.h); pop();
  }
}

class Ball {
  constructor() { this.reset(); }
  reset() {
    this.r = map(speedLevel, 1, 3, 75, 55);
    this.x = random(this.r, width - this.r); this.y = -this.r;
    this.vx = random(-3, 3); this.vy = 2;
    this.gravity = 0.18 * pow(1.2, speedLevel - 1); this.isResetting = false;
  }
  update() {
    if (this.isResetting) return;
    this.x += this.vx; this.y += this.vy; this.vy += this.gravity;
    if (this.x < this.r) { this.x = this.r; this.vx *= -0.8; } 
    else if (this.x > width - this.r) { this.x = width - this.r; this.vx *= -0.8; }
    if (this.y < this.r) { this.y = this.r; this.vy *= -0.5; }
  }
  bounce(ax, py) { this.vy = -py; this.vx = ax; }
  display() {
    fill(ballColorHex); noStroke(); ellipse(this.x, this.y, this.r * 2);
    fill(255, 230); ellipse(this.x - this.r*0.3, this.y - this.r*0.3, this.r*0.5);
  }
}
