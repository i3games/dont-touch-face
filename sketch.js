const DEBUG = true; // switch console.log
const handPixelThreshold = 200; // minimum amount of pixels of type hand visible
const facePixelThreshold = 100; // minimum amount of pixels of type face visible
const radius = 3; // radius in pixels around the hand pixel sampled to look for face pixels

const options = {
  architecture: "MobileNetV1",
  multiplier: 0.75, // 0 - 1, defaults to 0.75, higher is slower / more accurate
  outputStride: 16, // 8, 16, or 32, default is 16, higher is faster / less accurate
  segmentationThreshold: 0.5, // 0 - 1, defaults to 0.5
  palette: {
    leftFace: {
      id: 0,
      color: [110, 64, 170]
    },
    rightFace: {
      id: 1,
      color: [110, 64, 170]
    },
    rightUpperLegFront: {
      id: 2,
      color: [64, 64, 64]
    },
    rightLowerLegBack: {
      id: 3,
      color: [64, 64, 64]
    },
    rightUpperLegBack: {
      id: 4,
      color: [64, 64, 64]
    },
    leftLowerLegFront: {
      id: 5,
      color: [64, 64, 64]
    },
    leftUpperLegFront: {
      id: 6,
      color: [64, 64, 64]
    },
    leftUpperLegBack: {
      id: 7,
      color: [64, 64, 64]
    },
    leftLowerLegBack: {
      id: 8,
      color: [64, 64, 64]
    },
    rightFeet: {
      id: 9,
      color: [64, 64, 64]
    },
    rightLowerLegFront: {
      id: 10,
      color: [64, 64, 64]
    },
    leftFeet: {
      id: 11,
      color: [64, 64, 64]
    },
    torsoFront: {
      id: 12,
      color: [64, 64, 64]
    },
    torsoBack: {
      id: 13,
      color: [64, 64, 64]
    },
    rightUpperArmFront: {
      id: 14,
      color: [64, 64, 64]
    },
    rightUpperArmBack: {
      id: 15,
      color: [64, 64, 64]
    },
    rightLowerArmBack: {
      id: 16,
      color: [64, 64, 64]
    },
    leftLowerArmFront: {
      id: 17,
      color: [64, 64, 64]
    },
    leftUpperArmFront: {
      id: 18,
      color: [64, 64, 64]
    },
    leftUpperArmBack: {
      id: 19,
      color: [64, 64, 64]
    },
    leftLowerArmBack: {
      id: 20,
      color: [64, 64, 64]
    },
    rightHand: {
      id: 21,
      color: [0, 243, 88]
    },
    rightLowerArmFront: {
      id: 22,
      color: [64, 64, 64]
    },
    leftHand: {
      id: 23,
      color: [0, 243, 88]
    }
  }
};

let bodypix,
  checkboxSegmentationView,
  checkboxSound,
  checkboxVisual,
  segmentation,
  envelope,
  radioPerformance,
  sliderSegmentationThreshold,
  sound,
  uiDiv,
  video;
let facePixels = 0, handPixels = 0, soundFrequency = 189;
let clicked = false;

function preload() {
  bodypix = ml5.bodyPix(options);
}

function setup() {
  createCanvas(320, 240).parent('canvas-area');
  radioPerformance = selectAll('.performance');
  for (let i = 0; i < radioPerformance.length; i++) {
    radioPerformance[i].changed(switchPerformance);
  }
  checkboxVisual = select('#visualalarm');
  checkboxSound = select('#soundalarm');  
  sliderSegmentationThreshold = select('#segmentationthreshold'); 
  checkboxSegmentationView = select('#segmentationview');

  sound = new p5.SawOsc();
  envelope = new p5.Env();
  envelope.setADSR(0.001, 0.6, 0.1, 0.5);
  envelope.setRange(1, 0);
  sound.freq(soundFrequency);

  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();
  bodypix.segmentWithParts(video, gotResults, options);
}

function switchPerformance(value) {
  const val = value.target.value;
  if (val === "low") {
    options.multiplier = 0.25;
    options.outputStride = 32;
  } else if (val === "medium") {
    options.multiplier = 0.5;
    options.outputStride = 16;
  } else if (val === "high") {
    options.multiplier = 0.75;
    options.outputStride = 0;
  }
}

function alarm() {
  if (checkboxVisual.checked()) {
    background(255, 0, 0);
  }
  if (checkboxSound.checked()) {
    sound.start();
    envelope.play(sound, 0, 0.1);
  }
  if (DEBUG) { console.log("alarm"); }
}

function touchStarted() {
  clicked = true;
}

function mousePressed() {
  clicked = true;
}

function gotResults(err, segmentation) {
  if (err) {
    console.log(err);
    return;
  }

  const leftHandId = segmentation.bodyParts.leftHand.id;
  const rightHandId = segmentation.bodyParts.rightHand.id;
  const leftFaceId = segmentation.bodyParts.leftFace.id;
  const rightFaceId = segmentation.bodyParts.rightFace.id;

  function isFace(pixel) {
    return pixel == leftHandId || pixel == rightHandId;
  }
  function isHand(pixel) {
    return pixel == leftFaceId || pixel == rightFaceId;
  }

  let h = segmentation.raw.partMask.height;
  let w = segmentation.raw.partMask.width;
  const current = segmentation.segmentation.data;

  // console.log(segmentation.segmentation.data);
  // TODO appears to be a BUG, segmentation data array seems to be fixed length 640 * 480 should be of size w * h ?
  // console.log(w, h, current.length, clicked);
  h = 480;
  w = 640;

  handPixels = 0;
  facePixels = 0;

  if (checkboxSegmentationView.checked()) {
    image(segmentation.partMask, 0, 0, width, height);
  } else {
    background(255, 255, 255);
  }

  for (const [i, v] of current.entries()) {
    if (isHand(v)) {
      handPixels++;

      if (handPixels > handPixelThreshold && facePixels > facePixelThreshold) {
        // minimum amount of hand / face pixels
        // crude but quick
        let left = current[i - radius];
        let right = current[i + radius];
        let top = current[i - radius * w]; // TODO, see BUG above
        let bottom = current[i + radius * w]; // TODO, see BUG above

        let topleft = current[i - radius * w - radius];
        let topright = current[i - radius * w + radius];
        let bottomleft = current[i + radius * w - radius];
        let bottomright = current[i + radius * w + radius];

        if (
          (left && isFace(left)) ||
          (right && isFace(right)) ||
          (top && isFace(top)) ||
          (bottom && isFace(bottom)) ||
          (topleft && isFace(topleft)) ||
          (topright && isFace(topright)) ||
          (bottomleft && isFace(bottomleft)) ||
          (bottomright && isFace(bottomright))
        ) {
          alarm();
          break;
        }
      }
    } else if (isFace(v)) {
      facePixels++;
    }
  }
  // image(video, 0, 0, width, height);

  if (!clicked) {
    // might need up to 2 clicks to start, focus the canvas and user interaction
    textAlign(CENTER, CENTER);
    textSize(width / 8);
    text("tap/click twice", width / 2, height / 2);
  }

  options.segmentationThreshold = sliderSegmentationThreshold.value();
  bodypix.segmentWithParts(video, gotResults, options);
}
