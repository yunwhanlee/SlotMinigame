"use strict";
console.log("MinigameSlot");

import { MAJOR_VERSION, MINOR_VERSION, REVISION, DATE } from "./Version.js";
// import * as _global from "./Globals.js";
// import * as _config from "./Config.js";
// import * as _context from "./Context.js";
// import * as _text from "./Text.js";
// import * as _gui from "./GUI.js";
// import * as _audio from "./Audio.js";
// import * as _enum from "./Enum.js";
// import * as _request from "./Request.js";
import * as _util from "./Utilities.js";

//* AUTO당첨카운트 주기
let WIN_MODE_SPAN = 7; // 해당배수의 카운트면 당첨확정 ON

//* Meta Data
const serverURL = _util.getMeta('serverURL');
console.log("serverURL=", serverURL);
const imgDir = serverURL + "img/minigameSlot/";
const miniCharaDir = imgDir + "miniChara/";
const modelDir = imgDir + "model/";
const sfxDir = imgDir + "sfx/";
const miniCharaSfxDir = sfxDir + "miniChara/";
const efDir = imgDir + "effect/";
/// ------------------------------------------------------------------------
//* WINDOW
/// ------------------------------------------------------------------------
/* 하단(Bottom)の우측 */
const version = document.querySelector("#version");
version.textContent = `Ver${MAJOR_VERSION}.${MINOR_VERSION}.${REVISION}`;
/* 탑(Top)の좌측 */
//* 디버그 ON・OFF아이콘
const topDebugLogIcon = document.querySelector("#top-debug-log-icon");
//* 이펙트 FPS 표시 아이콘
const topEfFPSIcon = document.querySelector("#top-ef-fps-icon");
//* 당첨됫다면、오른쪽에서 모델이미지 출현
const congraLeftImg = document.querySelector(".left-congraturation-img");
//* 당첨됫다면、왼쪽에서 모델이미지 출현
const congraRightImg = document.querySelector(".right-congraturation-img");
//* 당첨됫다면、중앙에서 미니모델이미지 출현
const miniCharaImgElem = document.querySelector(".miniChara");
const miniCharaScreamBubble = document.querySelector(".screamBubble");
//* 당첨됫다면、Effects 이펙트
const ef_RoundShiny = document.querySelector("#ef_RoundShiny");
const ef_SmallHitLeft = document.querySelector("#ef_SmallHitLeft");
const ef_SmallHitRight = document.querySelector("#ef_SmallHitRight");
const ef_Impact = document.querySelector("#ef_impact");
//* 보너스스Effect
const bonusTxtBig = document.querySelector(".bonus-txt-big");
const bonusTxtTiny = document.querySelector(".bonus-txt-tiny");
bonusTxtBig.classList.add('hidden');
bonusTxtTiny.classList.add('hidden');

//* EFFECT PreLoad
const efRoundImgPathList = [];
const efSmallHitPathList = [];
const efImpactPathList = [];

//* 이미지 경과리스트 로드
const FPS = 60;
for(let i = 0; i < FPS; i++) {
    setImgPathList("roundShiny", efRoundImgPathList, i, FPS);
    setImgPathList("smallHit", efSmallHitPathList, i, FPS);
    setImgPathList("impact", efImpactPathList, i, FPS);
}

//* Interval ID Effects
let ef_RoundShinyID = null;
let ef_SmallHitLeftID = null;
let ef_SmallHitRightID = null;
let ef_ImpactID = null;

//* 이펙트FPS 옵션
let isHalfFpsOpt = true; // 실제서버가 스펙이 느리므로, FPS 변경가능한 옵션 추가.
let gamePadReqAnim = null;
let gamePadUpdate = null;

//* 게임패드의 스핀 조이스틱 눌렀을때 트리거
let isPushSpin1Btn = false;
let isPushSpin2Btn = false;
let isPushSpin3Btn = false;

let pressCnt = 0;
let onClickStopSpinBtn = null;
let actChangeMiniChara = null; //* Action

//* 초기화화
topEfFPSIcon.textContent = `FPS${isHalfFpsOpt? "30" : "60"}`;

//* KEYBoard Event
window.addEventListener('keydown', (e) => {
    console.log("e.key=", e.key);
    //* EFFECT읽어오기 테스트
    if(e.key == 'a') playRoundShinyEF();
    if(e.key == 's') playSmallHitLeftEF();
    if(e.key == 'd') playSmallHitRightEF();
    if(e.key == 'f') playImpactEF();
    //* AUTO당첨카운트 조정
    if(e.key == 'ArrowUp') {
        
        WIN_MODE_SPAN++;
        autoWinSpanLogTxt.text = "当たりカウント倍数：" + WIN_MODE_SPAN;
    }
    if(e.key == 'ArrowDown') {
        WIN_MODE_SPAN--;
        if(WIN_MODE_SPAN < 0) WIN_MODE_SPAN = 0;
        autoWinSpanLogTxt.text = "当たりカウント倍数：" + WIN_MODE_SPAN;
    }
});

//* top Icon Event
topDebugLogIcon.addEventListener('click', (e) => onClickDebugLogIcon());
topEfFPSIcon.addEventListener('click', (e) => onClickFPSIcon());
// topWinModeIcon.addEventListener('click', (e) => onClickWinModeIcon());

//* 게임패드드 Event
window.addEventListener("gamepadconnected", (e) => {
    console.log(
        "Gamepad connected at index %d: %s. %d buttons, %d axes.",
        e.gamepad.index,
        e.gamepad.id,
        e.gamepad.buttons.length,
        e.gamepad.axes.length,
    );
});

const buttonPressed = (button) => {
    if (typeof button == "object") {
        return button.pressed;
    }
    return button == 1.0;
};

window.addEventListener("gamepadconnected", (e) => {
    gamePadUpdate();
});

/// ------------------------------------------------------------------------
//* PIXI JS CANVAS
/// ------------------------------------------------------------------------
const W_RATIO_BY_H = 2.05;
let canvasHeight = window.innerHeight; //* 세로화면으로 가로비율을 맞춤.
let canvasWidth = canvasHeight * W_RATIO_BY_H;
setCanvasAspect(); //* Canvas의 비율을 맞춰서 계산.

//* Canvas Init
const app = new PIXI.Application({
    width: canvasWidth,
    height: canvasHeight,
    resolution: window.devicePixelRatio || 1,
    antialias: false,
    autoDensity: true,
    autoResize: true,
    background: '#000000',
    resolution: devicePixelRatio
});
document.body.appendChild(app.view);

const modelList = [ // 13명 모델
    //* 이 5명은 미니캐릭터로 가운데 등장
    {name: "koto", jp: "翼　ことり", winCnt: 130},
    {name: "miral", jp: "葵川ミラル", winCnt: 130},
    {name: "nago", jp: "日向なごみ", winCnt: 130},
    {name: "oto", jp: "竜胆 おとは", winCnt: 130},
    {name: "taka", jp: "向上心　たかコ", winCnt: 130},
    // 슬롯머신 모델 캐릭터터
    {name: "alen", jp: "角崎アレン・アルフォード", winCnt: 130},
    {name: "fuwa", jp: "はにかむふわり", winCnt: 130},
    {name: "ichi", jp: "天乃川いちか", winCnt: 130},
    {name: "mari", jp: "マリー", winCnt: 130},
    {name: "mei", jp: "猫乃子メイ", winCnt: 130},
    {name: "nemu", jp: "黒騎　ネム", winCnt: 130},
    {name: "niko", jp: "神田　にこ", winCnt: 130},
    {name: "tal", jp: "新橋タルキッス", winCnt: 130},
];

//* Resource
PIXI.Assets.add('slotBg', `${imgDir + "slotBg.png"}`);
PIXI.Assets.add('slotBody', `${imgDir + "slotbody.png"}`);
PIXI.Assets.add('title', `${imgDir + "title.png"}`);
PIXI.Assets.add('bodyLight1', `${imgDir + "light1.png"}`);
PIXI.Assets.add('bodyLight2', `${imgDir + "light2.png"}`);
PIXI.Assets.add('button1On', `${imgDir + "button1On.png"}`);
PIXI.Assets.add('button2On', `${imgDir + "button2On.png"}`);
PIXI.Assets.add('button3On', `${imgDir + "button3On.png"}`);
PIXI.Assets.add('button4On', `${imgDir + "button4On.png"}`);
PIXI.Assets.add('focusArrow', `${imgDir + "focusArrowDown.png"}`);
PIXI.Assets.add('miniChara', `${miniCharaDir + "otoMini.png"}`);
PIXI.Assets.add('speechBubble', `${imgDir + "speechBubble.png"}`);
PIXI.Assets.add('lightRotatePink', `${imgDir + "lightRotatePink.png"}`);
PIXI.Assets.add('lightRotateYellow', `${imgDir + "lightRotateYellow.png"}`);

//* Model
PIXI.Assets.add('congraBanner', `${modelDir + "nago/nagoBanner.png"}`);

//* SFX 생성
PIXI.sound.add('bonusSFX', `${sfxDir + "bonusSFX.mp3"}`);
PIXI.sound.add('btnClickSFX', `${sfxDir + "btnClickSFX.wav"}`);
PIXI.sound.add('reelStopSFX', `${sfxDir + "reelStopSFX.wav"}`);
PIXI.sound.add('startSFX', `${sfxDir + "startSFX.mp3"}`);
PIXI.sound.add('tadaSFX', `${sfxDir + "tadaSFX.mp3"}`);
PIXI.sound.add('twinkleSFX', `${sfxDir + "twinkleSFX.mp3"}`);
PIXI.sound.add('jumpSFX', `${sfxDir + "jumpSFX.mp3"}`);
PIXI.sound.add('stunSFX', `${sfxDir + "stunSFX.mp3"}`);
PIXI.sound.add('coinSFX', `${sfxDir + "getCoinSFX.mp3"}`);

//* miniChara SFX 생성성
const MINICHARA_MODEL_LEN = 5;
const miniCharaNameList = modelList.filter((_, idx) => idx < MINICHARA_MODEL_LEN).map(model => model.name);
console.log("miniCharaList=", miniCharaNameList);
miniCharaNameList.forEach(name => {
    PIXI.sound.add(`${name}_reelStop1SFX`, `${miniCharaSfxDir + `${name}/` + "reelStop1SFX.wav"}`);
    PIXI.sound.add(`${name}_reelStop2SFX`, `${miniCharaSfxDir + `${name}/` + "reelStop2SFX.wav"}`);
    PIXI.sound.add(`${name}_reelStop3SFX`, `${miniCharaSfxDir + `${name}/` + "reelStop3SFX.wav"}`);
    PIXI.sound.add(`${name}_startSFX`, `${miniCharaSfxDir + `${name}/` + "startSFX.wav"}`);
    PIXI.sound.add(`${name}_richSFX`, `${miniCharaSfxDir + `${name}/` + "richSFX.wav"}`);
    PIXI.sound.add(`${name}_sadSFX`, `${miniCharaSfxDir + `${name}/` + "sadSFX.wav"}`);
    PIXI.sound.add(`${name}_winSFX`, `${miniCharaSfxDir + `${name}/` + "winAdSFX.mp3"}`);
});

PIXI.Assets.load([
    'slotBody',
    'title',
    'slotBg',
    'bodyLight1', 'bodyLight2',
    'button1On', 'button2On', 'button3On', 'button4On',
    'focusArrow',
    'miniChara', 'speechBubble',
    'lightRotatePink', 'lightRotateYellow',
    'congraBanner',
]).then(setup);

//* VALUE
const ALTC = 'ALTC'; // After Long Type Cnt
const BANNER_VIDEO_LYAER = 33;

const COL = 3;
const ROW = 21;
const REEL_WIDTH = canvasHeight * 0.16; //127;
const SYMBOL_SIZE = canvasHeight * 0.125; //110;

const SYMBOL_VERTICAL_SPACE_RATIO = 1.25;
console.log("canvasHeight=", canvasHeight, ", SYMBOL_VERTICAL_SPACE_RATIO=", SYMBOL_VERTICAL_SPACE_RATIO);
const REEL_POS_Y_OFFSET = -(canvasHeight * 0.105) //-100;
const STOPSPIN_TIME = 1500; // 정지시간
const WAIT_NEXT_CLICK_TIME = STOPSPIN_TIME * 0.8;
const FIXPOS_TIME = 400; // LongType위치정렬시간
const CONGRETURATION_TIME = 4000;
const AUTO_CLICK_TIME = 10000; // 1000 -> 1초
const { width, height } = app.screen;
const stageSize = { width, height };
const ResultSymbolRangeMinY = canvasHeight * 0.17;
const ResultSymbolRangeMaxY = canvasHeight * 0.18;

const symbolDir = "symbols/";

//* miniChara 데이터리스트 생성
const miniCharaDtList = [];
miniCharaNameList.forEach(name => {
    miniCharaDtList.push(
        // 데이터
        {
            name: `${name}Mini`, 
            texture: PIXI.Texture.from(`${miniCharaDir + `${name}Mini.png`}`),
            reelStop1SFX: `${name}_reelStop1SFX`,
            reelStop2SFX: `${name}_reelStop2SFX`,
            reelStop3SFX: `${name}_reelStop3SFX`,
            startSFX: `${name}_startSFX`,
            richSFX: `${name}_richSFX`,
            sadSFX: `${name}_sadSFX`,
            winSFX: `${name}_winSFX`,
        }
    );
});
console.log()

//* Symbols
const slotTextures = [
    PIXI.Texture.from(`${imgDir + symbolDir + "777.png"}`),
    PIXI.Texture.from(`${imgDir + symbolDir + "bar.png"}`),
    PIXI.Texture.from(`${imgDir + symbolDir + "chr.png"}`),
    //* 모델 (Index3 ~ 마지막Index) 추가
];

let lightRotatePink = null;
let lightRotateYellow = null;

//* Model Banners
const modelBannerTextures = [];
//* Model Left Anim
const modelLeftAnimImgPaths = [];
//* Model Right Anim
const modelRightAnimImgPaths = [];

//* Add (추가)
modelList.forEach(model => {
    const name = model.name;
    //* 모델심볼
    slotTextures.push(PIXI.Texture.from(`${imgDir + symbolDir + `${name}.png`}`));
    //* 모델배너
    modelBannerTextures.push(PIXI.Texture.from(`${modelDir + `${name}/${name}Banner.png`}`));
    //* 모델왼쪽 애니메이션 이미지
    modelLeftAnimImgPaths.push(`${modelDir + `${name}/${name}Left.png`}`);
    //* 모델오른쪽 애니메이션 이미지
    modelRightAnimImgPaths.push(`${modelDir + `${name}/${name}Right.png`}`);
});

//* 플레이수
let playCnt = 1;

//* Credit (Heart Cnt)
let heartCnt = -1;

//* miniCharaIdx
let miniCharaIdx = -1;

//* 스핀기기
let isWaitNextClick = false;
let waitNextClickID = null;
let autoClickID = null;

//* 당첨트리거
let winModeRandomModelIdx = 3;
let isWinControlTrigger = false;
let isWinForceTrigger = false;
let winModeForceHeartCnt = null;

let isWaitCongratuClick = false;
const congraBannerFilter = new PIXI.filters.BlurFilter();

//* Text
let logTxt = null;
let resultLogTxt = null;
let autoWinSpanLogTxt = null;
let creditIconTxt = null;
let playCntTxt = null;

//* Title
let title = null;

//* Anim ID
// 안내화살표 (스핀정지)
let isFocusArrowDown = false;
let focusArrowAnimItvID = null;
// 빛나는 효과 애니메니션
let winBodyLightAnimItvID = null;
let winEtcLightAnimItvID = null;

//* EFFECT
// Star
const starEfCnt = 10;
const starTexture = PIXI.Texture.from(`${imgDir + "star.png"}`);
let star = {
    efs : [],
    randOrgPosX : 0,
    randOrgPosY : 0,
    time: 0,
}

//* Start
setup();

//* System Init
function setup() {
    //* Slot Machine
    const slotBg = Object.assign(PIXI.Sprite.from('slotBg'), stageSize);
    slotBg.name = "slogBg";
    const slotBody = Object.assign(PIXI.Sprite.from('slotBody'), stageSize);
    slotBody.name = "slotBody";
    title = Object.assign(PIXI.Sprite.from('title'), stageSize);
    title.name = "title";
    const bodyLight1 = Object.assign(PIXI.Sprite.from('bodyLight1'), stageSize);
    const bodyLight2 = Object.assign(PIXI.Sprite.from('bodyLight2'), stageSize);
    const btn1On = Object.assign(PIXI.Sprite.from('button1On'), stageSize);
    const btn2On = Object.assign(PIXI.Sprite.from('button2On'), stageSize);
    const btn3On = Object.assign(PIXI.Sprite.from('button3On'), stageSize);
    const btn4On = Object.assign(PIXI.Sprite.from('button4On'), stageSize);
    const focusArrow = Object.assign(PIXI.Sprite.from('focusArrow'), {width:48, height: 48});

    //* 미니캐릭터
    const miniChara = Object.assign(PIXI.Sprite.from('miniChara'), {width: stageSize.height * 0.275, height: stageSize.height * 0.4});
    const speechBubble = Object.assign(PIXI.Sprite.from('speechBubble'), {width:stageSize.height * 0.3, height: stageSize.height * 0.225});

    //* 당첨「おめでとう이펙트」요소
    lightRotatePink = Object.assign(PIXI.Sprite.from('lightRotatePink'), {width: stageSize.height * 0.7, height: stageSize.height * 0.7});
    lightRotateYellow = Object.assign(PIXI.Sprite.from('lightRotateYellow'), {width: stageSize.height * 0.7, height: stageSize.height * 0.7});
    const congraBanner = Object.assign(PIXI.Sprite.from('congraBanner'), {width:stageSize.width * 0.41, height: stageSize.height * 0.41});
    congraBanner.filters = [congraBannerFilter];

    // Build the reels
    let reel = {};
    let reel2 = {};
    let reel3 = {};
    const reelContainer = new PIXI.Container();

    app.stage.addChild(
        slotBg,
    );

    for (let i = 0; i < COL; i++) {
        const rc = new PIXI.Container();

        rc.x = i * REEL_WIDTH;
        reelContainer.addChild(rc);

        const reelObj = {
            isRun: false,
            isStopTrg: false,
            isWinTrg: false,
            container: rc,
            symbols: [],
            resList: [],
            worldPosition: {x: 0, y: canvasHeight * 0.65},
            position: 0,
            previousPosition: 0,
            blur: new PIXI.filters.BlurFilter(),
        };

        reelObj.blur.blurX = 0;
        reelObj.blur.blurY = 0;
        rc.filters = [reelObj.blur];

        // Build the symbols
        for (let j = 0; j < ROW; j++) {
            const symbol = new PIXI.Sprite(slotTextures[Math.floor(Math.random() * slotTextures.length)]);
            // const symbol = new PIXI.Sprite(slotTextures[3]);

            const name = getSymbolName(symbol);

            //* Scale the symbol to fit symbol area.
            symbol.y = j * SYMBOL_SIZE;
            const mass = Math.min(SYMBOL_SIZE / symbol.width, SYMBOL_SIZE / symbol.height);
            symbol.scale.x = mass;
            symbol.scale.y = mass;
            symbol.x = Math.round((SYMBOL_SIZE - symbol.width) / 2);

            //* Check Long Height Type
            const isLongType = checkIsLongTypeSymbol(name);
            // console.log("(", j , ") isLongType=", isLongType, ", name= ", name, ",symbolW=", symbol.width, ", H=", symbol.height);
            if (isLongType) {
                j += 2;
                const targetHeight = SYMBOL_SIZE * 2.25;
                symbol.y = j * targetHeight;
                const scaleFactor = targetHeight / symbol.height;
                symbol.scale.x *= scaleFactor;
                symbol.scale.y *= scaleFactor;
                symbol.x = Math.round((SYMBOL_SIZE - symbol.width) / 2);
            }

            // symbol.tint = 0xffff00;

            reelObj.symbols.push(symbol);
            rc.addChild(symbol);
        }
        //* 슬롯라인(＝릴릴)
        if(i == 0) {
            reelObj.worldPosition.x = canvasWidth * 0.425;
            reel = reelObj;
        }
        if(i == 1) {
            reelObj.worldPosition.x = canvasWidth * 0.505;
            reel2 = reelObj;
        }
        if(i == 2) {
            reelObj.worldPosition.x = canvasWidth * 0.58;
            reel3 = reelObj;
        }
    }

    //* Focus Arrow Icon
    // Origin Pos
    focusArrow.x = 9999;
    focusArrow.y = 9999;

    //* MiniChara
    miniCharaIdx = getRandomInt(0, miniCharaDtList.length);

    miniChara.anchor.set(0.5);
    miniChara.x = canvasWidth * 0.8;
    miniChara.y = canvasHeight * 0.6;
    miniChara.rotation = 0.2;
    //* MiniChara Anim
    setTimeout(() => {
        const startY = miniChara.y;
        const rotVal = 0.05;
        playMiniCharaLoofPosYAnim(miniChara, startY);
        playMiniCharaLoofRotateAnim(miniChara, rotVal);
    }, 1000);

    //* SpeechBubble
    speechBubble.anchor.set(0.5);
    speechBubble.x = miniChara.x - canvasHeight * 0.15;
    speechBubble.y = miniChara.y - canvasHeight * 0.265;

    //* Congraturation Model Animation
    console.log("congraBanner.scale=", congraBanner.scale.x, congraBanner.scale.y)
    congraBanner.visible = false;
    congraBanner.anchor.set(0.5);
    congraBanner.x = stageSize.width * 0.5;
    congraBanner.y = stageSize.height * 0.31;

    lightRotateYellow.visible = false;
    lightRotatePink.visible = false;
    lightRotateYellow.anchor.set(0.5);
    lightRotatePink.anchor.set(0.5);
    lightRotateYellow.alpha = 0.7;
    lightRotatePink.alpha = 0.6;
    lightRotateYellow.x = canvasWidth / 2;
    lightRotatePink.x = canvasWidth / 2;

    const congraModel = new PIXI.Sprite(slotTextures[3]);
    congraModel.name = "congraModel";
    initCongraturation(congraModel);

    app.stage.addChild(
        reelContainer,
        congraBanner,
        slotBody,
        title,
        bodyLight1, bodyLight2,
        btn1On, btn2On, btn3On, btn4On,
        focusArrow, 
        miniChara, speechBubble,
        congraModel,
        lightRotateYellow, lightRotatePink,
    );

    // Build top & bottom covers and position reelContainer
    const margin = (app.screen.height - SYMBOL_SIZE * 3) / 1;
    
    // console.log("SIBAL=", margin + REEL_POS_Y_OFFSET);
    reelContainer.x = Math.round(canvasWidth - REEL_WIDTH * 7.75);
    reelContainer.y = margin + REEL_POS_Y_OFFSET;
    const top = new PIXI.Graphics();
    top.x = app.screen.width / 2;
    top.y += app.screen.height * 0.125;

    const bottom = new PIXI.Graphics();
    bottom.x = app.screen.width * 0.39875;
    bottom.y += app.screen.height * 0.225;

    const titleDimPanel = new PIXI.Graphics();
    titleDimPanel.beginFill(0x000000);
    titleDimPanel.alpha = 0.9;
    titleDimPanel.drawRect(0, 0, canvasWidth, canvasHeight);
    titleDimPanel.endFill();

//* --------------------------------------------------------------------------------------------
// #region 텍스트 ------------------------------------------------------------------------------
//* --------------------------------------------------------------------------------------------
    // Add play text
    const titleStlye = {
        fontFamily: 'Arial',
        fontSize: canvasHeight * 0.2,
        fontStyle: 'italic',
        fontWeight: 'bold',
        fill: ['#ffffff', '#00ff99'], // gradient
        stroke: '#4a1850',
        strokeThickness: 5,
        dropShadow: true,
        dropShadowColor: '#000000',
        dropShadowBlur: 4,
        dropShadowAngle: Math.PI / 6,
        dropShadowDistance: 6,
        wordWrap: true,
        wordWrapWidth: 440,
    }
    const style = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: canvasHeight * 0.045,
        fontStyle: 'italic',
        fontWeight: 'bold',
        fill: ['#ffffff', '#00ff99'], // gradient
        stroke: '#4a1850',
        strokeThickness: 5,
        dropShadow: true,
        dropShadowColor: '#000000',
        dropShadowBlur: 4,
        dropShadowAngle: Math.PI / 6,
        dropShadowDistance: 6,
        wordWrap: true,
        wordWrapWidth: 440,
    });
    const whiteFontstyle = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fill: ['#ffffff'],
        stroke: '#4a1850',
        strokeThickness: 1,
        dropShadow: true,
        dropShadowColor: '#000000',
        dropShadowBlur: 4,
    });
    const whiteSmallStyle = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: canvasHeight * 0.018,
        fill: ['#ffffff'],
        dropShadow: true,
        dropShadowColor: '#000000',
        dropShadowBlur: 4,
        dropShadowAngle: Math.PI / 6,
        dropShadowDistance: 6,
    });
    const purpleSmallStyle = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: canvasHeight * 0.018,
        fill: ['#ffffff'],
        dropShadow: true,
        dropShadowColor: '#000000',
        dropShadowBlur: 4,
        dropShadowAngle: Math.PI / 6,
        dropShadowDistance: 6,
        stroke: '#4a1850',
        strokeThickness: 5,
    });
    const yellowSmallStyle = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: canvasHeight * 0.02,
        fill: ['#effa82']
    });
    const modelNameTitleStyle = new PIXI.TextStyle({
        dropShadow: true,
        dropShadowColor: "#ff6600",
        fill: ["#ffffff", "#ffed75"],
        fontFamily: "\"Lucida Console\", Monaco, monospace",
        fontSize: 45,
        fontWeight: "bold",
        letterSpacing: 1,
        padding: 4,
        stroke: "#282900",
        strokeThickness: 5
    });
    const bigRedFontStyle = new PIXI.TextStyle({
        fill: "#ff0000",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: canvasHeight * 0.04,
        fontWeight: "bold",
        stroke: "#ffffff"
    });
    const normalStyle = new PIXI.TextStyle({
        fontSize: canvasHeight * 0.0275
    });

    
    const spin1Txt = new PIXI.Text('SP1', style);
    const spin2Txt = new PIXI.Text('SP2', style);
    const spin3Txt = new PIXI.Text('SP3', style);
    const resetTxt = new PIXI.Text('RST', style);

    const posY = app.screen.height - margin + Math.round((margin - spin1Txt.height) * 0.45);

    resetTxt.x = Math.round(canvasWidth * -0.075);
    resetTxt.y = posY;
    resetTxt.alpha = 0;
    bottom.addChild(resetTxt);

    spin1Txt.x = Math.round(canvasWidth * 0);
    spin1Txt.y = posY;
    spin1Txt.alpha = 0;
    bottom.addChild(spin1Txt);

    spin2Txt.x = Math.round(canvasWidth * 0.07);
    spin2Txt.y = posY;
    spin2Txt.alpha = 0;
    bottom.addChild(spin2Txt);

    spin3Txt.x = Math.round(canvasWidth * 0.14);
    spin3Txt.y = posY;
    spin3Txt.alpha = 0;
    bottom.addChild(spin3Txt);



    // Congraturation Title Txt
    const congratuTitleTxt = new PIXI.Text("", modelNameTitleStyle);
    congratuTitleTxt.anchor.set(0.5);
    congratuTitleTxt.x = canvasWidth / 2;
    congratuTitleTxt.y = canvasHeight * 0.35;

    // Banner Play Text Button
    const bannerPlayText = new PIXI.Text('ゲームスタート▶', titleStlye);
    bannerPlayText.x = Math.round((top.width - bannerPlayText.width) / 2);
    bannerPlayText.y = Math.round((margin - bannerPlayText.height) / 2);
    top.addChild(bannerPlayText);

    //* 자동당첨모드의 배수 표시
    autoWinSpanLogTxt = new PIXI.Text(`当たりカウント倍数：${WIN_MODE_SPAN}`, whiteFontstyle);
    autoWinSpanLogTxt.visible = false;
    autoWinSpanLogTxt.tint = 0xffffff;
    autoWinSpanLogTxt.x = canvasWidth * 0.075;
    autoWinSpanLogTxt.y = canvasHeight * 0;

    //* 릴의 결과표시
    resultLogTxt = new PIXI.Text("結果:", whiteFontstyle);
    resultLogTxt.visible = false;
    resultLogTxt.tint = 0xffffff;
    resultLogTxt.x = canvasWidth * 0.075;
    resultLogTxt.y = canvasHeight * 0.05;

    //* 당첨된 모델의 카운트 표시
    logTxt = new PIXI.Text("Log", whiteFontstyle);
    logTxt.visible = false;
    logTxt.tint = 0xffffff;
    logTxt.x = canvasWidth * 0.075;
    logTxt.y = canvasHeight * 0.1;

    setModelWinCntTable();

    //* MiniChara SpeechBubble Text
    const speechBubbleTxt = new PIXI.Text("    スロットを\nスタートしてね！", normalStyle);
    speechBubbleTxt.visible = true;
    speechBubbleTxt.anchor.set(0.5);
    speechBubbleTxt.x = speechBubble.x;
    speechBubbleTxt.y = speechBubble.y;

    //* MiniChara Name 표시
    const miniCharaNameTxt = new PIXI.Text("○○○", purpleSmallStyle);
    miniCharaNameTxt.anchor.set(0.5);
    miniCharaNameTxt.x = miniChara.x * 1;
    miniCharaNameTxt.y = miniChara.y * 1.36875;
    miniCharaNameTxt.text = modelList[3].jp;

    //! DEBUG Arrow Win Symbol posY
    const winArrowStartIcon = new PIXI.Text("▷", whiteFontstyle);
    winArrowStartIcon.x = canvasWidth * 0.36;
    winArrowStartIcon.y = ResultSymbolRangeMinY + reelContainer.y;

    const winArrowEndIcon = new PIXI.Text("▶", whiteFontstyle);
    winArrowEndIcon.x = canvasWidth * 0.36;
    winArrowEndIcon.y = ResultSymbolRangeMaxY + reelContainer.y;

    creditIconTxt = new PIXI.Text("", normalStyle);
    creditIconTxt.x = canvasWidth * 0.62;
    creditIconTxt.y = canvasHeight * 0.949;

    playCntTxt = new PIXI.Text("プレイカウント：", whiteSmallStyle);
    playCntTxt.x = canvasWidth * 0.275;
    playCntTxt.y = canvasHeight * 0.956;

    app.stage.addChild(bottom);
    app.stage.addChild(autoWinSpanLogTxt);
    app.stage.addChild(resultLogTxt);
    app.stage.addChild(logTxt);
    app.stage.addChild(congratuTitleTxt);
    app.stage.addChild(speechBubbleTxt);
    app.stage.addChild(miniCharaNameTxt);
    app.stage.addChild(winArrowStartIcon);
    app.stage.addChild(winArrowEndIcon);
    app.stage.addChild(creditIconTxt);
    app.stage.addChild(playCntTxt);
    app.stage.addChild(titleDimPanel);
    app.stage.addChild(top);
// #endregion
//* --------------------------------------------------------------------------------------------
// #region イベント ------------------------------------------------------------------------------
//* --------------------------------------------------------------------------------------------
    //* Banner Video 재생버튼
    top.eventMode = 'static';
    top.cursor = 'pointer';
    top.addListener('pointerdown', () => playBanner());

    // bottom.eventMode = 'static';
    // bottom.cursor = 'pointer';
    // bottom.addListener('pointerdown', () => onClickStopSpinBtn());

    resetTxt.eventMode = 'static';
    resetTxt.cursor = 'pointer';
    resetTxt.addListener('pointerdown', () => {
        if(heartCnt <= 0) {
            console.log("heartCnt= ", heartCnt);
            reset();
        }
        onClickStopSpinBtn();
    });

    spin1Txt.eventMode = 'static';
    spin1Txt.cursor = 'pointer';
    spin1Txt.addListener('pointerdown', () => {
        if(!reel.isStopTrg && !reel2.isStopTrg && !reel3.isStopTrg)
            onClickStopSpinBtn();
    });

    spin2Txt.eventMode = 'static';
    spin2Txt.cursor = 'pointer';
    spin2Txt.addListener('pointerdown', () => {
        if(reel.isStopTrg && !reel2.isStopTrg && !reel3.isStopTrg)
            onClickStopSpinBtn();
    });


    spin3Txt.eventMode = 'static';
    spin3Txt.cursor = 'pointer';
    spin3Txt.addListener('pointerdown', () => {
        if(reel.isStopTrg && reel2.isStopTrg && !reel3.isStopTrg)
            onClickStopSpinBtn();
    });

    //* 게임패드 키 대응
    gamePadUpdate = () => {
        const gamepads = navigator.getGamepads
            ? navigator.getGamepads()
            : navigator.webkitGetGamepads
            ? navigator.webkitGetGamepads
            : [];
        if (!gamepads) {
            return;
        }
        
        //* 게임패트 객체
        const gp = gamepads[0];

        //* 누르는 조건
        const INISIALIZE = (!reel.isStopTrg && !reel2.isStopTrg && !reel3.isStopTrg && !reel.isRun && !reel2.isRun && !reel3.isRun);
        const STOP_SPIN1 = (!reel.isStopTrg && !reel2.isStopTrg && !reel3.isStopTrg && reel.isRun && reel2.isRun && reel3.isRun);
        const STOP_SPIN2 = (reel.isStopTrg && !reel2.isStopTrg && !reel3.isStopTrg && !reel.isRun && reel2.isRun && reel3.isRun);
        const STOP_SPIN3 = (reel.isStopTrg && reel2.isStopTrg && !reel3.isStopTrg && !reel.isRun && !reel2.isRun && reel3.isRun);
        const ALL_STOP = (isPushSpin1Btn && isPushSpin2Btn && isPushSpin3Btn);

        //* 방향컨트롤러
        // console.log("gp.axes=", gp.axes);        
        const UP_DOWN = 1; // const LEFT_RIGHT = 0;
        if (gp.axes[UP_DOWN] === 1) {
            if(INISIALIZE)
                onClickStopSpinBtn();
        }
        
        //* 버튼튼
        // console.log("gp=", gp.buttons);
        const OPTIONS_BTN = 9;
        const X_BTN = 1;
        const O_BTN = 2;
        const R2 = 7;

        //* OPTIONS_BTN
        
        if (buttonPressed(gp.buttons[OPTIONS_BTN])) {
            console.log("pressCnt=", pressCnt, "PRESS OPTIONS_BTN", gp.buttons[OPTIONS_BTN]);
            if(INISIALIZE) {
                reset();
            }
            //* reset()안에 pressCnt가있지만、게임패드의 경우, 항상pressCnt가 증가하도록하여、도중에도 당첨모드에 들어가도록 하기
            else {
                pressCnt++;
                setWinModeByPressCnt();
            }
        }
        //* OPTION 조이스틱 버튼을 눌렀다가 떼는순간、pressCnt를0으로 초기화.
        if(gp.buttons[OPTIONS_BTN].pressed == false) {
            console.log("OPTIONS_BTN:: press Up");
            pressCnt = 0;
        }

        //* X_BTN
        if (buttonPressed(gp.buttons[X_BTN])) {
            console.log("PRESS X_BTN");
            console.log("isPushSpin1Btn=", isPushSpin1Btn, "isPushSpin2Btn=", isPushSpin2Btn);
            if(!ALL_STOP) {
                isPushSpin1Btn = true;
                onBtns(false, false, true, true);
            }
            if(STOP_SPIN1) {
                onClickStopSpinBtn();
            }
        }
        //* O_BTN
        if (buttonPressed(gp.buttons[O_BTN])) {
            console.log("PRESS O_BTN");
            console.log("isPushSpin1Btn=", isPushSpin1Btn, "isPushSpin2Btn=", isPushSpin2Btn);
            if(isPushSpin1Btn && !ALL_STOP) {
                isPushSpin2Btn = true;
                onBtns(false, false, false, true);
            }
            if(STOP_SPIN2) {
                onClickStopSpinBtn();
            }
        //* R2_BTN
        } else if (buttonPressed(gp.buttons[R2])) {
            console.log("PRESS R2_BTN");
            console.log("isPushSpin1Btn=", isPushSpin1Btn, "isPushSpin2Btn=", isPushSpin2Btn);
            if(isPushSpin1Btn && isPushSpin2Btn && !ALL_STOP) {
                isPushSpin3Btn = true;
                onBtns(false, false, false, false);
            }
            if(STOP_SPIN3) {
                onClickStopSpinBtn();
            }
        }
    
        gamePadReqAnim = requestAnimationFrame(gamePadUpdate);
    };

    //! GamePad가연결되면、매회 OPTION버튼의pressed가false이기때문에、pressCnt가０으로된다.
    //? PC에서플레이할경우、GamePad 연결을 빼주세요.
    //* 스페이스바로 플레이 가능
    window.addEventListener('keydown', (e) => {
        console.log("keydown::e.key=", e.key, ",pressCnt=", pressCnt);
        if(e.code == 'Space') {
            reset();
        }
    });

    //* 스페이스바를 뗄때 초기화 이벤트 실행
    window.addEventListener('keyup', (e) => {
        console.log("keyUp")
        if(e.code == 'Space')
            pressCnt = 0;
    });
// #endregion
//* --------------------------------------------------------------------------------------------
// #region 함수 ------------------------------------------------------------------------------
//* --------------------------------------------------------------------------------------------
    // 배너재생
    function playBanner() {
        console.log("top:: PointerDown!");
        const sc = 0.41;
        bannerPlayText.destroy();
        titleDimPanel.destroy();
        const videotexture = PIXI.Texture.from(`${imgDir + "vvland_SoundBannerVideo.mp4"}`);
        videotexture.baseTexture.resource.source.loop = true;
        const videoSprite = new PIXI.Sprite(videotexture);
        videoSprite.width = canvasWidth * sc;//0.34;
        videoSprite.height = canvasHeight * sc;//0.34;
        videoSprite.x = canvasWidth / 2 - videoSprite.width / 2;
        videoSprite.y = canvasHeight * 0.02;
        app.stage.addChildAt(videoSprite);
        videoSprite.name = "bannerVideo";
        app.stage.setChildIndex(videoSprite, BANNER_VIDEO_LYAER);
        console.log("app.stage=", app.stage);
    }

    actChangeMiniChara = () => {
        speechBubbleTxt.text = "こんにちは！";
        //* MiniChara의Index 교체
        const befIdx = miniCharaIdx;
        let rand = getRandomInt(0, miniCharaDtList.length);
        miniCharaIdx = rand;
        console.log("actChangeMiniChara():: miniCharaIdx=", miniCharaIdx, ", rand=", rand);
        //* 이전과같다면 멀리떨어뜨려서 교체
        while(befIdx === rand) {
            console.log("以前と同じイから、MiniCharaのIndexを切り替え");
            rand = getRandomInt(0, miniCharaDtList.length);
            miniCharaIdx = rand;
        }
        miniCharaNameTxt.text = modelList[miniCharaIdx].jp;
        miniChara.texture = miniCharaDtList[miniCharaIdx].texture;
        miniCharaImgElem.src = miniCharaDir + miniCharaDtList[miniCharaIdx].name + ".png";
    }

    onClickStopSpinBtn = () => {
        clearTimeout(autoClickID);
        console.log("isWaitNextClick=", isWaitNextClick, "isWaitCongratuClick=", isWaitCongratuClick);
        console.log("onClickStopSpinBtn():: Before Trigger\nr1.Trg:", reel.isStopTrg, "r2.Trg:", reel2.isStopTrg, "r3.Trg:", reel3.isStopTrg, "\nr1.Run:", reel.isRun, "r2.Run:", reel2.isRun, "r3.Run:", reel3.isRun);
        //* 각버튼클릭의사이에 대기
        if(isWaitNextClick == true) return;
        if(isWaitCongratuClick == true) return;

        //* 시작(전체스핀)
        if(!reel.isStopTrg && !reel2.isStopTrg && !reel3.isStopTrg
            && !reel.isRun && !reel2.isRun && !reel3.isRun) {
            onWaitNextClick(100);

            heartCnt--;
            setCreditUI(creditIconTxt, heartCnt);
            
            //* Credet(하트)가없다면, 아래 실행하지 않음.
            if(heartCnt < 0) {
                speechBubbleTxt.text = "RESETして\nクレジットを\nもらって！";
                return;
            }

            //* 플레이카운트에서 당첨모드주기가 됬다면、Win 당첨모드 ON
            if(!isWinForceTrigger) {
                console.log("playCnt=", playCnt);
                if(playCnt % WIN_MODE_SPAN == 0) {
                    //* 당첨모드ON
                    onClickWinModeIcon();
                    //* 플레이카운트
                    setPlayCntUI(playCntTxt, playCnt++, yellowSmallStyle);
                }
                else {
                    //* 당첨모드 자동 Off
                    if(isWinControlTrigger) 
                        onClickWinModeIcon();
                    //* 플레이카운트
                    setPlayCntUI(playCntTxt, playCnt++, whiteSmallStyle);
                }
            }

            //* Win모드가ON의 경우、모델Index를 랜덤으로 교체（계속해서플레이해도、자연스러운 움직임을 주기위해）
            if(isWinControlTrigger) {
                const modelIdx = getRadomWithCalcModelCntPercentage();
                winModeRandomModelIdx = 3 + modelIdx;
            }
            //* Auto Click
            autoClickID = setTimeout(onClickStopSpinBtn, AUTO_CLICK_TIME);
            //* 처리
            PIXI.sound.play('startSFX');
            reel.isRun = true;
            spinReel(reel);
            reel2.isRun = true;
            spinReel(reel2);
            reel3.isRun = true;
            spinReel(reel3);
            onBtns(false, true, true, true);

            congraBanner.visible = false;
            congratuTitleTxt.text = "";
            resultLogTxt.text = "Result:";
            speechBubbleTxt.text = "スタート！";
            speechBubbleTxt.style = normalStyle;
            speechBubble.visible = true;
            speechBubbleTxt.visible = true;

            //* 초기화
            isPushSpin1Btn = false;
            isPushSpin2Btn = false;
            isPushSpin3Btn = false;
            reel.isWinTrg = false;
            reel2.isWinTrg = false;
            reel3.isWinTrg = false;
            reel.resList = [];
            reel2.resList = [];
            reel3.resList = [];
            // lightRotateYellow.visible = false;
            // lightRotatePink.visible = false;
            
            //* 요소 비표시
            miniCharaImgElem.classList.add('hidden');
            miniCharaScreamBubble.classList.add('hidden');
            congraLeftImg.classList.add('hidden');
            congraRightImg.classList.add('hidden');
            bonusTxtBig.classList.add('hidden');
            bonusTxtTiny.classList.add('hidden');

            console.log("onClickStopSpinBtn():: After Trigger\nr1.Trg:", reel.isStopTrg, "r2.Trg:", reel2.isStopTrg, "r3.Trg:", reel3.isStopTrg, "\nr1.Run:", reel.isRun, "r2.Run:", reel2.isRun, "r3.Run:", reel3.isRun);
            return;
        }

        PIXI.sound.play('btnClickSFX');

        //* 스핀정지 대기중이면, 이하처리 하지않음
        const leftX = canvasWidth * 0.41;
        const centerX = canvasWidth * 0.49;
        const rightX = canvasWidth * 0.57;
        const reelHeadPosY = canvasHeight * 0.44;
        if(!reel.isStopTrg) {
            PIXI.sound.play(miniCharaDtList[miniCharaIdx].reelStop1SFX);
            autoClickID = setTimeout(onClickStopSpinBtn, AUTO_CLICK_TIME);
            onWaitNextClick(WAIT_NEXT_CLICK_TIME);
            controlReal(reel);
            onBtns(false, false, true, true);
            playFocusArrowAnim(focusArrow, leftX, reelHeadPosY);
            setTimeout(() => {
                //* 다음으로 진행행
                if(isPushSpin2Btn) onClickStopSpinBtn();
            }, WAIT_NEXT_CLICK_TIME);
            console.log("onClickStopSpinBtn():: After Trigger\nr1.Trg:", reel.isStopTrg, "r2.Trg:", reel2.isStopTrg, "r3.Trg:", reel3.isStopTrg, "\nr1.Run:", reel.isRun, "r2.Run:", reel2.isRun, "r3.Run:", reel3.isRun);
            return;
        }
        if(!reel2.isStopTrg) {
            console.log("reel2.Stop:: isPushSpin3Btn=", isPushSpin3Btn);
            PIXI.sound.play(miniCharaDtList[miniCharaIdx].reelStop2SFX);
            autoClickID = setTimeout(onClickStopSpinBtn, AUTO_CLICK_TIME);
            onWaitNextClick(WAIT_NEXT_CLICK_TIME);
            controlReal(reel2);
            if(!isPushSpin3Btn) onBtns(false, false, false, true);
            else onBtns(false, false, false, false);
            playFocusArrowAnim(focusArrow, centerX, reelHeadPosY);
            setTimeout(() => {
                console.log("RESLIST:: reel.resList[0]=", reel.resList[0], "reel2.resList[0]=", reel2.resList[0]);
                //* 리-치！
                if(reel.resList[0] == reel2.resList[0])
                    PIXI.sound.play('twinkleSFX');
                //* 다음으로 진행
                if(isPushSpin3Btn) onClickStopSpinBtn();
            }, WAIT_NEXT_CLICK_TIME);
            console.log("onClickStopSpinBtn():: After Trigger\nr1.Trg:", reel.isStopTrg, "r2.Trg:", reel2.isStopTrg, "r3.Trg:", reel3.isStopTrg, "\nr1.Run:", reel.isRun, "r2.Run:", reel2.isRun, "r3.Run:", reel3.isRun);
            return;
        }
        if(!reel3.isStopTrg) {
            PIXI.sound.play(miniCharaDtList[miniCharaIdx].reelStop3SFX);
            onWaitNextClick(WAIT_NEXT_CLICK_TIME * 2);
            controlReal(reel3);
            onBtns(false, false, false, false);
            playFocusArrowAnim(focusArrow, rightX, reelHeadPosY);
            
            setTimeout(() => {
                //* 전체슬롯이 멈췄다면, 트리거 초기화
                reel.isStopTrg = false;
                reel2.isStopTrg = false;
                reel3.isStopTrg = false;
                onBtns(true, false, false, false);
                focusArrow.x = 9999;
                focusArrow.y = 9999;
            }, WAIT_NEXT_CLICK_TIME * 2); // 1초후에 시행 : tweenToのbackout(0.5)이펙트가 마지막에 적용이 안되는 버그대응
            console.log("onClickStopSpinBtn():: After Trigger\nr1.Trg:", reel.isStopTrg, "r2.Trg:", reel2.isStopTrg, "r3.Trg:", reel3.isStopTrg, "\nr1.Run:", reel.isRun, "r2.Run:", reel2.isRun, "r3.Run:", reel3.isRun);
            return;
        }
    }

    function controlReal(r) {
        if(!r.isRun) {
            r.isRun = true;
            spinReel(r);
        }
        else {
            r.isRun = false;
            r.isStopTrg = true;
        }
    }

    function spinReel(r) {
        console.log("spinReel:: ");
        const target = r.position + 10;
        tweenTo(r, 'position', target, STOPSPIN_TIME / 3, linear, null, r.isRun? () => {reelComplete(r)} : null);
    }
    //* Reels done handler.
    function reelComplete(r) {
        if(!r.isStopTrg) {
            spinReel(r);
        }
        if(r.isStopTrg) {
            stopReel(r);
        }
    }

    function stopReel(r) {
        // console.log("stopReel():: reel.symbols=", r.symbols);
        const time = FIXPOS_TIME;
        const target = r.position + 10;
        tweenTo(r, 'position', target, STOPSPIN_TIME, backout(0.5), null, () => {
            setTimeout(() => {
                console.log("stopReel:: r.symbols=", r.symbols);
                console.log("reel3.resList.length=", reel3.resList.length);
                r.symbols.forEach(symbol => {
                    //* ３번째 심볼 준비
                    if(ResultSymbolRangeMinY < symbol.y && symbol.y <= ResultSymbolRangeMaxY) {
                        //* 멈춘심볼을 확인
                        // symbol.tint = 0xff0000; // Debug용의 붉은색
                        const imgPath = symbol.texture.baseTexture.cacheId;
                        const splitArr = imgPath.split('/');
                        const imgfile = splitArr[splitArr.length - 1];
                        const fName = imgfile.split('.')[0];
                        console.log("Result Symbol.fileName=", fName);

                        //* LongType이라면、resList설정.
                        if(checkIsLongTypeSymbol(fName)) {
                            //* 결과를 여기서 설정함
                            r.resList.forEach(res => res.name = fName);
                            console.log("r.resList=", r.resList);
                        }
                        resultLogTxt.text += `${r.resList[2].name},`;

                        //* 사운드 (당첨상태에 따른)
                        const resultstr = resultLogTxt.text.split(":")[1];
                        const resultList = resultstr.split(',');
                        console.log(`resultstr -> ${resultstr}(${resultList.length})`);
                        const reelCnt = resultList.length - 1;
                        if(reelCnt == 2) {
                            if(resultList[0] == resultList[1]) {
                                console.log("result 2つ当たり！");
                                PIXI.sound.play('twinkleSFX');
                                speechBubbleTxt.text = "リーチ！！";
                                speechBubbleTxt.style = bigRedFontStyle;
                                PIXI.sound.play(miniCharaDtList[miniCharaIdx].richSFX);
                            }
                        }
                        else if(reelCnt == 3) {
                            if(resultList[0] == resultList[1] && resultList[1] == resultList[2] && resultList[2] == resultList[0]) {
                                console.log("result 3つ当たり！");
                                PIXI.sound.play('tadaSFX');
                                PIXI.sound.play(miniCharaDtList[miniCharaIdx].winSFX);
                                //* 당첨모드 OFF 초기화
                                if(isWinForceTrigger || isWinControlTrigger)
                                    onClickWinModeIcon();
                                isWinForceTrigger = false;
                                winModeForceHeartCnt = null;
                            }
                        }
                        if(reel3.resList.length != 0) {                            
                            checkResult();
                        }
                    }
                });
            }, time);
        });
        setResultSymbols(r, STOPSPIN_TIME);
        r.isWinTrg = isWinControlTrigger;

        //* 강제 WinMode ON이된 경우
        if(winModeForceHeartCnt != null) {
            r.isWinTrg = (heartCnt <= winModeForceHeartCnt);
            // console.log(`r.isWinTrg= ${r.isWinTrg}: heartCnt(${heartCnt}) <= winModeForceHeartCnt(${winModeForceHeartCnt})`);
        }
        console.log("stopReel:: r=", r, ", r.isWinTrg=", r.isWinTrg);        
    }

    //* check Reels Result
    function setResultSymbols(r, delay) {
        setTimeout(() => {
            console.log("----------reelResult:: symbols=", r.symbols, "----------");
            PIXI.sound.play('reelStopSFX');
            playStarEFs(r);

            const resList = [];
            // logTxt.text = "";
            r.symbols.forEach((s, i) => {
                playStopReelBounceSymbolAnim(s);

                const viewStartPos = -50;
                const viewEndPos = SYMBOL_SIZE * 2;
                s.name += getSymbolName(s);

                //* ALTC걸려있는LongType의 이름을 수정
                if(s.name.includes(ALTC)) {
                    if(checkIsLongTypeSymbol(s.name)) {
                        s.name = s.name.split('_')[1];
                        console.log("LongTypeなのに、ALTCが付いてることはALTC削除:[", i,"]", s.name);
                    }
                }

                // logTxt.text += `\n[${i}] ${s.name}`;

                //* 멈춘리스트
                if(viewStartPos < s.position.y && s.position.y < viewEndPos) {
                    // logTxt.text += "(★)";
                    // s.tint = 0xff0000;
                    console.log("reelResult():: i:",  i, ",name=",s.name, ", s.y=", Math.floor(s.position.y));
                    const temp = {
                        idx: i,
                        name: s.name
                    };
                    resList.push(temp);
                    i++;
                }
            });

            //* 로그
            // logTxt.text += "\n\n--ORIGIN--";
            // resList.forEach(res => logTxt.text += `\n[${res.idx}] ${res.name}`);

            //* 초과한인덱스순서의 수정
            // logTxt.text += "\n\n--MODIFY ORDER--";
            const firstIdx = resList[0].idx;
            resList.forEach((res, i) => {
                if((firstIdx + i) != res.idx)
                    resList.unshift(resList.pop()); //* 맨끝의 IDX➝ 맨앞으로 이동.
            });

            // resList.forEach(res => logTxt.text += `\n[${res.idx}] ${res.name}`);

            //* 맞춰서LongTypeSymbol의 위치조정
            const longType = {
                isOn: false,
                name: ""
            }

            resList.forEach((s, i, arr) => {
                if(checkIsLongTypeSymbol(s.name) && i == 2) {
                    console.log(`Modify LongType(-):: ピッタリ`);
                    //* 딱맞다면 사용하지않음.
                    longType.isOn = true;
                    longType.name = s.name;
                }
                //* 위에서 아래로
                else  if(checkIsLongTypeSymbol(s.name) && i < 2) {
                    longType.isOn = true;
                    longType.name = s.name;
                    //* Top Or Center
                    const mass = 2 - i; //* MASS 단위
                    console.log(`Modify LongType(↓) i:${i} ${s.name} ${mass}mass`);
                    const target = r.position + mass;
                    tweenTo(r, 'position', target, FIXPOS_TIME, backout(0.5), null);
                }
                //* 위에서 아래로
                else {
                    if(s.name.includes(ALTC)) {
                        if(i == 1 || i == 2) { //* Center Or Bottom
                            longType.isOn = true;

                            //* 딱맞다면、이하내용 처리안함함
                            if(checkIsLongTypeSymbol(arr[2].name)) return;

                            const value = s.name.split('_')[0].split('C')[1];
                            const mass = value;
                            const target = r.position - mass;
                            console.log(`Modify LongType(↑) Before s.name= ${s.name}, i= ${i}, ${mass}mass`);
                            tweenTo(r, 'position', target, FIXPOS_TIME, backout(0.5), null);

                            //* Set s.name to LongType Name
                            const findIdx = r.symbols.findIndex(symbol => symbol.name == s.name);
                            const longTypeIdx = findIdx + parseInt(mass);
                            longType.name = r.symbols[longTypeIdx % r.symbols.length].name;
                            console.log(`Modify LongType(↑) After  s.name= ${longType.name}, findIdx= ${findIdx}`);
                            s.name = longType.name;
                        }
                    }
                }
            });

            if(longType.isOn) {
                resList.forEach(res => res.name = longType.name);
            }

            //* 결과리스트
            // logTxt.text += "\n\n--RESULT--"; //* 로그
            // resList.forEach(res => logTxt.text += `\n[${res.idx}] ${res.name}`);
            r.resList = resList;
            // console.log("reel.List= " , reel.resList, "\nreel2.List=", reel2.resList, ",\nreel3.List=", reel3.resList);
            // resultLogTxt.text += `${resList[0].name},`;
        }, delay);
    }

    //* 슬롯 결과
    function checkResult() {
        console.log("checkResult()::");
        // heartCnt--;
        // setCreditUI(creditIconTxt, heartCnt);

        if(reel.resList[0].name == reel2.resList[0].name
        && reel2.resList[0].name == reel3.resList[0].name
        && reel3.resList[0].name == reel.resList[0].name) {
            //* 당첨애니메이션 재생중에는, 글릭이벤트가 안되도록
            onWaitCongraturationClick(3000);

            //* 💗라이프 0으로 초기화
            heartCnt = 0;
            setCreditUI(creditIconTxt, heartCnt);

            /* Left・Right・Banner Anim */
            const resName = reel.resList[0].name;
            const winModel = modelList.find(model => model.name === resName);
            winModel.winCnt--; //* 당첨모델을 카운트 다운
            const winIdx = modelList.indexOf(winModel);
            console.log("当たり！", resName, ",idx=", winIdx, ", winModel=", winModel);

            setModelWinCntTable();

            playBodyLightAnim(true);
            playBtnAndTitleLightAnim();
            
            //* 당첨모드 OFF 초기화
            if(isWinForceTrigger || isWinControlTrigger)
                onClickWinModeIcon();
            isWinForceTrigger = false;
            winModeForceHeartCnt = null;

            speechBubble.visible = false;
            speechBubbleTxt.visible = false;

            miniCharaImgElem.classList.remove('hidden');
            setTimeout(() => {
                PIXI.sound.play('jumpSFX');
                miniCharaScreamBubble.classList.remove('hidden');
            }, 500);

            playRoundShinyEF();
            setTimeout(playSmallHitLeftEF, 500);
            setTimeout(playSmallHitRightEF, 800);
            setTimeout(playImpactEF, 1200); 
            lightRotateYellow.visible = true;
            lightRotatePink.visible = true;

            congratuTitleTxt.text = modelList[winIdx].jp;
            congraBanner.texture = modelBannerTextures[winIdx];
            congraLeftImg.src = modelLeftAnimImgPaths[winIdx];
            congraRightImg.src = modelRightAnimImgPaths[winIdx];
            congraLeftImg.classList.remove('hidden');
            congraRightImg.classList.remove('hidden');
            congraBanner.visible = true;
            displayCongratuBannerBlurAnim(congraBannerFilter);
        }
        else {
            console.log("checkResult():: Wrong Reel-> isWinControlTrigger=", isWinControlTrigger, ",isWinForceTrigger=", isWinForceTrigger, ",heartCnt=", heartCnt);
            //* 당첨모드가 안됬다면 한번더 보너스
            if(isWinControlTrigger && isWinForceTrigger && heartCnt <= 0) {
                console.log("もう一回 ボーナス");
                speechBubbleTxt.text = "ボーナス！";
                speechBubbleTxt.style = normalStyle;
                bonusTxtBig.classList.remove('hidden');
                bonusTxtTiny.classList.remove('hidden');
                heartCnt++;
                setCreditUI(creditIconTxt, heartCnt);
                PIXI.sound.play('bonusSFX');
            }
            else {
                speechBubbleTxt.text = "ああ、\nおしい😢";
                speechBubbleTxt.style = normalStyle;
                PIXI.sound.play('stunSFX');
                PIXI.sound.play(miniCharaDtList[miniCharaIdx].sadSFX);
            }

        }

        //* Win Anim 종료
        setTimeout(() => {
            playBodyLightAnim(false);
            clearInterval(winEtcLightAnimItvID);
            title.visible = true;
            onBtns(true, false, false, false);
        }, CONGRETURATION_TIME);
    }

    // Real Update Symbol
    function updateReel(r, slotMassCnt) {
        // Update blur filter y amount based on speed.
        // This would be better if calculated with time in mind also. Now blur depends on frame rate.
        r.blur.blurY = (r.position - r.previousPosition) * 8;
        r.previousPosition = r.position;

        // Update symbol positions on reel.
        for (let j = 0; j < r.symbols.length; j++) {
            const s = r.symbols[j];
            const prevy = s.y;
            s.y = ((r.position + j) % r.symbols.length) * SYMBOL_SIZE / SYMBOL_VERTICAL_SPACE_RATIO - SYMBOL_SIZE;
            //* 스크롤 릴의 로테이션
            if (s.y < 0 && prevy > SYMBOL_SIZE) {
                const NORMAL = 0, LONG = 1;
                //* 노말심볼의 출현확률(N%비율)
                const WIN_MODE_NORMAL_PER = 6; //* 당첨모드라면
                const GENERAL_NORMAL_PER = 5; //* 보통이라면
                
                //* タイプ
                const randPer = Math.floor(Math.random() * 10 + 1);
                const normalPer = r.isWinTrg? WIN_MODE_NORMAL_PER : GENERAL_NORMAL_PER;
                const randType = (randPer < normalPer)? NORMAL : (slotMassCnt > 0)? NORMAL : LONG;
                //* Symbol
                let randIdx = (randType == NORMAL)? Math.floor(Math.random() * 3) : Math.floor(3 + Math.random() * modelList.length);
                // console.log("s.y=", s.y, ",prevy=", prevy, ",randPer=", randPer, ",randType=", randType == NORMAL? "NORMAL" : "LONG");
                console.log("updateReel:: r.isWinTrg=", r.isWinTrg ,", normalPer=", normalPer);

                //* 절때당첨모드ON이면、랜덤에서 선택한 모델INDEX로 고정
                if(randType == LONG && r.isWinTrg)
                    randIdx = winModeRandomModelIdx

                const isLongType = (randType == LONG && slotMassCnt == 0);
                s.texture = slotTextures[randIdx];
                //* 초기화
                s.alpha = 1;
                s.anchor.set(0);
                // console.log("randIdx=", randIdx, ",isLongType=", isLongType, ",cnt=", slotCnt);
                //* Transform
                const mass = Math.min(SYMBOL_SIZE / s.texture.width, SYMBOL_SIZE / s.texture.height);
                s.scale.x = mass;
                s.scale.y = mass;
                s.x = Math.round((SYMBOL_SIZE - s.width) / 2);
                if (isLongType) {
                    slotMassCnt = 2;
                    s.y = ((r.position + j) % r.symbols.length) * SYMBOL_SIZE / SYMBOL_VERTICAL_SPACE_RATIO - SYMBOL_SIZE;
                    // console.log("updateReel():: Long Type r.position=", r.position, ",s.y=", s.y, ", s.anchor=", s.anchor);
                    s.anchor.set(0, 0.6835);
                    const targetHeight = SYMBOL_SIZE * 2.25;
                    const scaleFactor = targetHeight / s.height;
                    s.scale.x *= scaleFactor;
                    s.scale.y *= scaleFactor;
                    s.x = Math.round((SYMBOL_SIZE - s.width) / 2);
                }
                else if(slotMassCnt > 0) {
                    // console.log("updateReel():: After Long Type Cnt=", slotCnt, "s.name=", s.name);
                    s.alpha = 0; //* LongType이랑 겹치는 심볼 이미지를 비표시
                    s.name = `${ALTC} ${3 - slotMassCnt}_`;
                    if(checkIsLongTypeSymbol(s.name)) {
                        console.log("ALTCなのに、LongType名前だった時に : ", s.name);
                    }
                    slotMassCnt--;
                }
                else {
                    s.name = "";
                }
            }
        }
        return slotMassCnt;
    }

    // Bottom Button Style
    function onBtns(btn1, btn2, btn3, btn4) {
        btn1On.visible = btn1;
        btn2On.visible = btn2;
        btn3On.visible = btn3;
        btn4On.visible = btn4;
    }
    function getSymbolName(symbol) {
        const urlSplit = symbol.texture.baseTexture.resource.url.toString().split('/');
        const fileName = urlSplit[urlSplit.length - 1];
        const name = fileName.split('.')[0];
        
        

        return name;
    }
    function checkIsLongTypeSymbol(name) {
        const isLongType = modelList.some(model => name.includes(model.name));
        console.log(`checkIsLongTypeSymbol(${name}):: isLongType= ${isLongType}`);
        return isLongType;
        // const isLongType = modelList.some(model => {
        //     console.log(`name(${name}).includes(${model.name})= ${name.includes(model.name)}`);
        //     return name.includes(model.name);
        // });
    }

    function reset() {
        pressCnt++;
        //* 게임리셋
        if(heartCnt < 0) {
            console.log("RESET!");
            heartCnt = 3;

            //* MiniChara 교체
            actChangeMiniChara();

            lightRotateYellow.visible = false;
            lightRotatePink.visible = false;

            //* 사운드드
            PIXI.sound.play('coinSFX');
            PIXI.sound.play(miniCharaDtList[miniCharaIdx].startSFX);

            setCreditUI(creditIconTxt, heartCnt);
            miniCharaImgElem.classList.add('hidden');
            miniCharaScreamBubble.classList.add('hidden');
            congraLeftImg.classList.add('hidden');
            congraRightImg.classList.add('hidden');
        }

        setWinModeByPressCnt();
    }
    function setWinModeByPressCnt() {
        if(pressCnt == 20) {
            isWinForceTrigger = !isWinForceTrigger;
            //* 💗라이프가３이면、２개에서 당첨
            if(heartCnt === 3) {
                winModeForceHeartCnt = 1;
            }
            //* 💗라이프가３이면、현재부터 당첨
            else if(heartCnt === 2) {
                winModeForceHeartCnt = 1;
            }
            //* 💗라이프가３이면、현재부터터 당첨
            else {
                winModeForceHeartCnt = 0;
            }
            console.log("setWinModeByPressCnt():: winModeForceHeartCnt=", winModeForceHeartCnt);
            //* 당첨모드 클릭 (ON or OFF)
            onClickWinModeIcon();
        }
    }
    function setModelWinCntTable() {
        modelList.forEach((model, idx) => {
            if(idx == 0) logTxt.text = "当たったモデル数 状況";
            logTxt.text += `\n- ${model.name} : ${model.winCnt}`;
        });
    }
// #endregion
//* --------------------------------------------------------------------------------------------
// #region アニメ ------------------------------------------------------------------------------
//* --------------------------------------------------------------------------------------------
    // body Light1, 2 Animation
    playBodyLightAnim(false);
    // button On Active
    onBtns(true, false, false, false);

    function playBodyLightAnim(isWin) {
        if(winBodyLightAnimItvID) clearInterval(winBodyLightAnimItvID);
        const ms = 1000;
        let animCnt = 0;
        let bodyLightSpd = isWin? 0.075 : 0.5;
        winBodyLightAnimItvID = setInterval(() => {
            const active = animCnt % 2 == 0;
            bodyLight1.visible = active;
            bodyLight2.visible = !active;
            animCnt++;
        }, bodyLightSpd * ms);
    }
    function playBtnAndTitleLightAnim() {
        const msSpan = 100;
        let animCnt = 0;
        //* Twincle Anim
        winEtcLightAnimItvID = setInterval(() => {
            //* Title
            if(animCnt % 3 == 0)   title.visible = false;
            else                   title.visible = true;
            //* Buttons
            if(animCnt % 4 == 0)    onBtns(true, false, false, false);
            if(animCnt % 4 == 1)    onBtns(false, true, false, false);
            if(animCnt % 4 == 2)    onBtns(false, false, true, false);
            if(animCnt % 4 == 3)    onBtns(false, false, false, true);

            animCnt++;
        }, msSpan);
    }

// #endregion

    //* LONG타입이면, slot1MassCnt가2가되고、심볼이 겹치지않도록 비표시
    let slot1MassCnt = 0;
    let slot2MassCnt = 0;
    let slot3MassCnt = 0;
    let randIdxList = [];
    randIdxList.push(Math.floor(Math.random() * slotTextures.length));
    app.ticker.add((delta) => {
        // Update the slots.
        slot1MassCnt = updateReel(reel, slot1MassCnt);
        slot2MassCnt = updateReel(reel2, slot2MassCnt);
        slot3MassCnt = updateReel(reel3, slot3MassCnt);
    });
}

// Very simple tweening utility function. This should be replaced with a proper tweening library in a real product.
const tweening = [];

function tweenTo(object, property, target, time, easing, onchange, oncomplete) {
    const tween = {
        object,
        property,
        propertyBeginValue: object[property],
        target,
        easing,
        time,
        change: onchange,
        complete: oncomplete,
        start: Date.now(),
    };

    tweening.push(tween);

    return tween;
}
// Listen for animate update.
app.ticker.add((delta) => {
    const now = Date.now();
    const remove = [];

    for (let i = 0; i < tweening.length; i++)
    {
        const t = tweening[i];
        const phase = Math.min(1, (now - t.start) / t.time);

        t.object[t.property] = lerp(t.propertyBeginValue, t.target, t.easing(phase));
        if (t.change) t.change(t);
        if (phase === 1)
        {
            t.object[t.property] = t.target;
            if (t.complete) t.complete(t);
            remove.push(t);
        }
    }
    for (let i = 0; i < remove.length; i++)
    {
        tweening.splice(tweening.indexOf(remove[i]), 1);
    }

    //* congraturation Light Rotation Anim
    if(lightRotateYellow.visible == true)
        lightRotateYellow.rotation += 0.02;
    if(lightRotatePink.visible == true)
        lightRotatePink.rotation  += 0.01;
});

// Basic lerp funtion.
function lerp(a1, a2, t) {
    return a1 * (1 - t) + a2 * t;
}
function linear(t) {
    return t;
}
// Backout function from tweenjs.
// https://github.com/CreateJS/TweenJS/blob/master/src/tweenjs/Ease.js
function backout(amount) {
    return (t) => (--t * t * ((amount + 1) * t + amount) + 1);
}
function backin(amount) {
    return (t) => t*t*((amount+1)*t-amount);
}
function easeIn(pow) {
    return (t) => Math.pow(t,pow);
}

function playFocusArrowAnim(focusArrow, x, y) {
    const time = 250;
    focusArrow.x = x;
    focusArrow.y = y;

    //* Up・Down 애니메이션
    if(focusArrowAnimItvID) clearInterval(focusArrowAnimItvID);

    focusArrowAnimItvID = setInterval(() => {
        if(isFocusArrowDown) tweenTo(focusArrow, 'y', y + 5, time, linear, null, () => isFocusArrowDown = false);
        else tweenTo(focusArrow, 'y', y - 5, time, linear, null, () => isFocusArrowDown = true);
    }, time);
}
function playMiniCharaLoofPosYAnim(miniChara, startY) {
    const time = 750;
    tweenTo(miniChara, 'y', startY - 5, time, linear, null, () => {
        tweenTo(miniChara, 'y', startY + 5, time, linear, null, () => {
            playMiniCharaLoofPosYAnim(miniChara, startY);
        });
    });
}
function playMiniCharaLoofRotateAnim(miniChara, rotVal) {
    const time = 1500;
    tweenTo(miniChara, 'rotation', -rotVal, time, linear, null, () => {
        tweenTo(miniChara, 'rotation', rotVal, time, linear, null, () => {
            playMiniCharaLoofRotateAnim(miniChara, rotVal);
        });
    });
}
function playCongraturationAnim(congraModel, reel) {
    initCongraturation(congraModel);
    //* 당첨된 모델이미지로 설정
    const IDX_OFFSET = 3;
    const resName = reel.resList[0].name;
    const findModelIdx = modelList.findIndex(model => model.name == resName) + IDX_OFFSET;
    console.log("playCongraturationAnim():: resName=", resName, ",findModelIdx=", findModelIdx);
    congraModel.texture = slotTextures[findModelIdx];

    const time = 1000;
    const tgDist = 1000;
    const tgPosX = congraModel.x + tgDist;
    const tgAlphaVal = 1;
    tweenTo(congraModel, 'alpha', tgAlphaVal, time, linear, null);
    tweenTo(congraModel, 'x', tgPosX, time, backout(0.8), null, 
        () => {
            setTimeout(() => {
                const backPosX = congraModel.x - tgDist;
                tweenTo(congraModel, 'x', backPosX, time * 1.5, backout(0.5), null);
            }, 3000);
        }
    );
}
function displayCongratuBannerBlurAnim(congraBannerFilter) {
    tweenTo(congraBannerFilter, 'blur', 0, 2500, backout(0.5), null);
}
function initCongraturation(congraModel) {
    congraModel.scale.x = 2;
    congraModel.scale.y = 2;
    congraModel.x = -1000;
    congraModel.visible = true;
    congraModel.alpha = 0;
}
function playStopReelBounceSymbolAnim(s) {
    const time = 200;
    const tgScaleRatio = 1.125;
    const origSc = s.scale.x;
    tweenTo(s.scale, 'x', origSc * tgScaleRatio, time, backout(0.5), null,
        () => tweenTo(s.scale, 'x', origSc, time, backout(0.5))
    );
    tweenTo(s.scale, 'y', origSc * tgScaleRatio, time, backout(1), null,
        () => tweenTo(s.scale, 'y', origSc, time, backout(1))
    );
}
//* --------------------------------------------------------------------------------------------
// #region WINDOW EVENT ------------------------------------------------------------------------------
//* --------------------------------------------------------------------------------------------
function onClickDebugLogIcon() {
    const isVisible = !logTxt.visible;
    autoWinSpanLogTxt.visible = isVisible;
    resultLogTxt.visible = isVisible;
    logTxt.visible = isVisible;
}
function onClickFPSIcon() {
    isHalfFpsOpt = !isHalfFpsOpt;
    topEfFPSIcon.textContent = `FPS${isHalfFpsOpt? "30" : "60"}`;
}
function onClickWinModeIcon() {
    console.log("onClickWinModeIcon():: isWinControlTrigger=", isWinControlTrigger);
    isWinControlTrigger = !isWinControlTrigger;
    if(isWinControlTrigger) {
        title.tint = 0xccffff;
        const modelIdx = getRadomWithCalcModelCntPercentage();
        winModeRandomModelIdx = 3 + modelIdx;
    }
    else {
        title.tint = 0xffffff;
    }
}
// #endregion
//* --------------------------------------------------------------------------------------------
// #region STAR EFFECT ------------------------------------------------------------------------------
//* --------------------------------------------------------------------------------------------
function playStarEFs(r) {
    const alphaVal = 0;
    const time = 1000;
    createStarEFs();
    star.efs.forEach(ef => {
        tweenTo(ef, 'alpha', alphaVal, time, linear,
        //* onChange
        () => rotateStarEFs(r.worldPosition),
        //* Complete
        () => ef.visible = false); //* 비표시
    });
}
function createStarEFs() { // private
    //* 이전의 EF데이터를 파괴하고 초기화
    if(star.efs.length > 0) {
        star.efs.forEach(ef => ef.destroy());
        star.efs = [];
    }
    //* 생성
    for (let i = 0; i < starEfCnt; i++) {
        const ef = new PIXI.Sprite(starTexture);
        initStarEF(ef); //* 속성초기화
        star.efs.push(ef);
        app.stage.addChild(ef);
    }
}
function initStarEF(ef) { // private
    ef.width = 96;
    ef.height = 96;
    ef.anchor.set(0.5);
    ef.x = 0;
    ef.y = 0;
    ef.alpha = 1;
    star.time = 0;
    ef.visible = true;
}
function rotateStarEFs(worldPos) { // private
    // console.log("rotateStarEFs:: worldPos=", worldPos);
    star.time++;
    const rotSpeed = 0.1;
    const spreadSpeed = 0.035;
    const distance = star.time * spreadSpeed;
    const startRadius = 10;
    star.efs.forEach((ef, i) => {
        const angle = star.time * rotSpeed + i * 20;
        // 삼각함수(x,y)
        const newX = worldPos.x + startRadius * Math.cos(angle) * distance;
        const newY = worldPos.y + startRadius * Math.sin(angle) * distance;
        // 적용용
        ef.x = newX;
        ef.y = newY;
        // console.log("EF STAR i=", i, ",ef.x=", ef.x, ",ef.y=", ef.y);
    });
}
// #endregion
//* --------------------------------------------------------------------------------------------
// #region EFFECT ------------------------------------------------------------------------------
//* --------------------------------------------------------------------------------------------
function updateEF(intervalID, imgElem, efPaths) {
    console.log("updateEF()::");
    const FPS = 60; // 이미지매수
    const FRAME_CNT = isHalfFpsOpt? FPS / 2 : FPS;
    const speed = isHalfFpsOpt? 40 : 30; // 재생속도
    //* ID 초기화
    if(intervalID) clearInterval(intervalID); // 아직끝나지않았다면、이전 것을 클리어
    else setTimeout(() => clearInterval(intervalID), speed * FRAME_CNT); // 시작
    let i = 0;
    intervalID = setInterval(() => {
        // console.log("setInterval():: i=", i);
        if(i < FPS) 
        imgElem.src = efPaths[i];
        i += isHalfFpsOpt? 2 : 1;
    }, speed);
}
function playRoundShinyEF() {
    updateEF(ef_RoundShinyID, ef_RoundShiny, efRoundImgPathList);
}
function playSmallHitLeftEF() {
    updateEF(ef_SmallHitLeftID, ef_SmallHitLeft, efSmallHitPathList);
}
function playSmallHitRightEF() {
    updateEF(ef_SmallHitRightID, ef_SmallHitRight, efSmallHitPathList);
}
function playImpactEF() {
    updateEF(ef_ImpactID, ef_Impact, efImpactPathList);
}

// #endregion
//* FUNC--------------------------------------------------------
function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min)) + min;
}
function onWaitNextClick(time) {
    console.log("onWaitNextClick(", time, "):: waitNextClickID=", waitNextClickID);
    if(waitNextClickID) clearTimeout(waitNextClickID);
    isWaitNextClick = true;
    setTimeout(() => isWaitNextClick = false, time);
}
function onWaitCongraturationClick(time) {
    isWaitCongratuClick = true;
    setTimeout(() => isWaitCongratuClick = false, time);
}
function setCanvasAspect() {
    console.log(`Window W: ${window.innerWidth}, H: ${window.innerHeight}`);
    console.log(`Canvas W: ${canvasWidth}, H: ${canvasHeight}`);
    if(canvasWidth > window.innerWidth) {
        console.log("canvasWidthがwindow.innerWidthより大きいから、幅が切れてしまうこと対応");
        const ratio = window.innerWidth / canvasWidth; //* Window의 가로폭을 canvas가로폭으로 나눠、가로가 모두 보여지도록 비율 계산.
        canvasHeight *= ratio; //* 기준이되는 세로에 비율을 맞춰서
        canvasWidth = canvasHeight * W_RATIO_BY_H; //* 맞는비율을 재계산 대입
    }
}
function setImgPathList(pathName, pathList, i) {
    const path = `${efDir}${pathName}/${pathName}${i % FPS}.png`;
    pathList.push(path);
}
function setCreditUI(creditIconTxt, cnt) {
    creditIconTxt.text = (cnt == 3)? "💗💗💗"
        : (cnt == 2)? "💗💗"
        : (cnt == 1)? "💗" 
        : "";
}
function setPlayCntUI(playCntTxt, playCnt, fontStyle) {
    playCntTxt.text = "プレイカウント：" + playCnt;
    playCntTxt.style = fontStyle;
}

/**
 * 모델의 winCnt에 기반하여 랜덤으로 모델 선택
 * @returns 선택된 모델의 INDEX
 */
function getRadomWithCalcModelCntPercentage() {
    let sum = 0; // 누적된 winCnt값
    let modelIdx = null; // 선택된 모델의 인덱스
    let totalWinCnt = modelList.reduce((acc, cur) => acc + cur.winCnt, 0); // 전체의 winCnt합계

    // 0 ~ totalWinCnt사이 랜덤값 생성
    const rand = Math.round(Math.random() * totalWinCnt);
    console.log("totalWinCnt=", totalWinCnt, ",rand=", rand);

    for (let i = 0; i < modelList.length; i++) {
        const min = sum; // 현재모델의 확률 범위의 시작
        sum += modelList[i].winCnt; // 현재모델의 winCnt를 누적하여 확률범위 계산
        const max = sum; // 현재모델의 확률 범위의 끝

        // 랜덤값이 현재모델의 확률범위에 포함되어있다면 선택
        if (rand < sum) {
            modelIdx = i; // 선택된 모델의 인덱스를 저장
            console.log(`★i(${i}) ${min} ~ ${max}, ${modelList[modelIdx].name}, modelIdx=${modelIdx}`);
            break; // 루프종료
        }

        // 현재모델을 지나간경우 로그 출력
        console.log(`i(${i}) sum= ${sum}, modelIdx= ${modelIdx}`);
    }

    return modelIdx; // 선택된 모델의 인덱스 반환
}
