(function(global) {
  
  // 'use strict';

  // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
  // requestAnimationFrame polyfill by Erik Möller
  // with fixes from Paul Irish and Tino Zijdel
  (function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    
    for (var x = 0; x < vendors.length && !global.requestAnimationFrame; ++x) {
      global.requestAnimationFrame = global[vendors[x]+'RequestAnimationFrame'];
      global.cancelAnimationFrame = global[vendors[x]+'CancelAnimationFrame'] ||
      global[vendors[x]+'CancelRequestAnimationFrame'];
    }
    
    if (!global.requestAnimationFrame)
      global.requestAnimationFrame = function(callback, element) {
        var currTime = Date.now();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = global.setTimeout(function() { callback(currTime + timeToCall); }, timeToCall);
        lastTime = currTime + timeToCall;
        return id;
      };

    if (!global.cancelAnimationFrame)
      global.cancelAnimationFrame = function(id) {
        clearTimeout(id);
      };
  }());
  
    
  // For timer calculations
  var startTime = 0;
  var passedTime = 0;
  var sessionMins = 0;
  var currentTime = 0;
  var sessions = 0;

  // For graphics and animation
  var color = '#cf9';
  var index = 0;
  var colors = ['#cf9', '#fcc'];
  var degrees = 0;
  var activeTimer = false;
  var animate = false;
  var font = 'Oswald';
  
  // For pause feature
  var paused = false;
  var lastPauseTime = 0;
  var pauseDuration = 0;

  // For timer controls and settings
  var runBtn = document.getElementById('btn-run');
  var resetBtn = document.getElementById('btn-reset');
  var limits = ['25', '5'];
  var sessionData = document.getElementById('input-session');
  var sessionPlus = document.querySelector('#session .btn-plus');
  var sessionMinus = document.querySelector('#session .btn-minus');
  var breakData = document.getElementById('input-break');
  var breakPlus = document.querySelector('#break .btn-plus');
  var breakMinus = document.querySelector('#break .btn-minus');
  
  // For alarm chime
  var sfx = document.getElementById('sound-effect');
  var sfxSrc = 'assets/audio/sfx_alien-chirp';

  // For error message
  var msg = document.getElementById('message');

  // For switching to minimalist view
  var panelNode = document.getElementById('panel');
  var footerNodes = document.getElementsByTagName('footer');
  var simpleView = false;

  // For switching between timer styles
  var modeBtn = document.getElementById('btn-mode');
  var mode = null;

  // For opening and closing the panel in mobile view
  var menuNode = document.getElementById('menu');
  var openMenu = true;

  // Canvas setup
  var canvas = document.createElement('canvas');
  var canvasBox = document.getElementById('canvas-box');

  if (canvas.getContext) {
    var ctx = canvas.getContext('2d');
    canvasBox.appendChild(canvas);
    canvas.width = global.innerWidth;
    canvas.height = global.innerHeight; 
    var W = canvas.width;
    var H = canvas.height;
  }
  else {
    msg.innerHtml = 'Your browser does not support this application.';
    msg.style.display = 'block';
  }

  var baseSize = null;
  
  // For better support across different screen sizes (RWD)
  if (W > H) {
    baseSize = H;
  } 
  else {
    baseSize = W;
  }


/* Audio
------------------------------------------------------------------------------*/

// Determines which audio format is best for your browser
  function getAudioFormat() {
    var audio = sfx;
    var extension;

    if (audio.canPlayType('audio/mp3') !== '') {
      extension = '.mp3';
    }
    else if (audio.canPlayType('audio/ogg') !== '') {
      extension = '.ogg';
    }
    else {
      msg.innerHTML = 'Unsupported audio format';
      msg.style.display = 'block';
    }
    return extension;
  }

  // Plays the alarm sound when the timer completes an interval
  function playTrack() {
    if (sfxSrc) {
      sfx.src = sfxSrc + getAudioFormat();
      sfx.load();
      sfx.play();
    }
    else {
      msg.innerHTML = 'Unable to load audio';
      msg.style.display = 'block';
    }
  }


/* Graphics
------------------------------------------------------------------------------*/

  // Renders the timer progress bar for mode B
  // 1. Rate should be inversely proportional to the specified time limit
  // 2. radians = angle in degrees * PI / 180
  // 3. Starting and ending angle adjusted to start at the top of the circle
  function renderCircleBar(curSec) {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = baseSize * 0.05;
    ctx.beginPath();
    ctx.arc(W/2, H/2, (baseSize/2 - baseSize * 0.15),0,2*Math.PI);	// 3
    ctx.stroke();
    ctx.closePath();
   
    var rate = 360 / (60 * sessionMins); // 1
    var radians = null;
    degrees = curSec * rate;
    radians = degrees * Math.PI / 180; // 2
    
    ctx.strokeStyle = color;
    ctx.lineWidth = baseSize * 0.05;
    ctx.beginPath();
    ctx.arc(W/2, H/2, (baseSize/2 - baseSize * 0.15), 270 * Math.PI/180, radians + 270 * Math.PI/180, false);	// 3
    ctx.stroke();
    ctx.closePath();
  }

  // Renders background color shift for mode B
  function renderBgColorShift(curSec) {
    
    // Used to calculate rate of color change
    var rate = parseFloat(curSec) / parseFloat(sessionMins * 60);
    var r, g, b, bgColor;

    if (activeTimer === false) {
      ctx.fillStyle = '#099';
    }
    
    // 1. Using the vales for teal rgb(0, 153, 153) and dark-red rgb(51, 0, 0)
    // 2. Take the difference of each rgb value and adjust the difference with the above calculated rate
    // 3. Subtract that difference from the teal values for the gradual color shift to dark-blue
    else if (index === 0) {
      r = Math.floor(51 * rate);
      g = Math.floor(153 - (153 * rate));
      b = Math.floor(153 - (153 * rate));
      
      bgColor = 'rgb(' + r + ',' + g + ',' + b + ')';
      ctx.fillStyle = bgColor;
    }
    else {
      ctx.fillStyle='#300';
    }

    ctx.fillRect(0, 0, W, H);
  }

  // Converts total seconds to x:00:00 format and renders result
  // curSec: current time in seconds
  function renderTimer(curSec) {
    curSec = curSec || 0;
    var fontSize;
    var txtWidth = '';
    var timePosX = (W/2);
    var time = '';
    var timeHr = '';
    var timeMin = Math.floor(((60 * sessionMins) - curSec) / 60);
    var timeSec = '00' + ((60 * sessionMins) - curSec) % 60;
    
    fontSize = baseSize * 0.1;
    
    if (timeMin >= 60) {
      timeHr = Math.floor(timeMin / 60);
      timeMin = timeMin % 60;
      time = timeHr;
    }
    else {
      time = '00';
    }
    
    time = ('00' + time).substr(-2);
    timeMin = ('00' + timeMin).substr(-2);
    timeSec = timeSec.substr(-2);
    
    ctx.fillStyle = '#cff';
    ctx.font = fontSize + 'px ' + font;
    txtWidth = ctx.measureText('00').width;
    ctx.textAlign = 'end';
    ctx.textBaseline = 'middle';
    
    ctx.fillText(time, timePosX, H/2 - txtWidth * 1.2);
    ctx.fillText(timeMin, timePosX, H/2);
    ctx.fillText(timeSec, timePosX, H/2 + 1* txtWidth * 1.2);
    
    ctx.textAlign = 'start';
    ctx.fillStyle = '#fff';
    sessions = ('00' + sessions).substr(-2);
    ctx.fillText(sessions, timePosX * 1.05, H/2);
  }

  
/* Animation
------------------------------------------------------------------------------*/
 
  // Updates all the timer components, alternating between the
  // session and break data when the timer completes an interval
  function update(now) {
    currentTime = (now - startTime - pauseDuration) / 1000;
    
    if ((sessionMins * 60) - currentTime <= 0) {
      playTrack();

      if (index === 0) {
        index = 1;
      }
      else {
        sessions++;
        index = 0;
      }

      sessionMins = limits[index];
      color = colors[index];
      resetNewInterval();
    }

    if (mode === 'b') {
      renderBgColorShift(currentTime);
      renderCircleBar(currentTime);
    }
    else {
      ctx.fillStyle = '#036';
      ctx.fillRect(0, 0, W, H);
      renderCircleBar(currentTime);
    }

    renderTimer(parseInt(currentTime, 10));
  }
  
  // Continually calls itself until `animate === false`
  function main() {
    var now = Date.now();
    update(now);
    passedTime = now;
    
    if (animate) {
      global.requestAnimationFrame(main);
    }
  }

  
/* Controls and settings
------------------------------------------------------------------------------*/

  // Callback for increasing and decreasing session minutes
  function adjustSessionTime(increasing=true) {
    var timerData = parseInt(sessionData.value, 10);
    
    if (timerData < 1440 && increasing === true) {
      sessionData.value++;
    }

    if (timerData > 1 && increasing === false) {
      sessionData.value--;
    }
    
    limits[0] = sessionData.value;
    sessionMins = limits[0];
  }

  // Callback for increasing and decreasing break minutes
  function adjustBreakTime(increasing=true) {
    var timerData = parseInt(breakData.value, 10);
    
    if (timerData < 1440 && increasing === true) {
      breakData.value++;
    }

    if (timerData > 1 && increasing === false) {
      breakData.value--;
    }

    limits[1] = breakData.value;
  }
  
  // Callback for initial timer and mode setting
  function toggleMode() {
    if (mode === 'a') {
      mode = 'b';
      modeBtn.innerHTML = 'mode A';
    }
    else {
      mode = 'a';
      modeBtn.innerHTML = 'mode B';
    }
  }

  // Callback for opening and closing of panel in mobile view
  function togglePanel() {
    if (openMenu === false) {
      panelNode.className = panelNode.className.replace(' slide-up', '');
      openMenu = true;
    }
    else {
      panelNode.className = panelNode.className + ' slide-up';
      openMenu = false;
    }
  }

  // Callback for starting and pausing the timer
  function togglePause() {
    var currentPauseTime = Date.now();
    
    if (animate === true) {
      lastPauseTime = currentPauseTime;
      paused = true;
      animate = false;
      runBtn.innerHTML = 'start';
      modeBtn.disabled = true;
    }
    else {
      pauseDuration += currentPauseTime - lastPauseTime;
      paused = false;
      animate = true;
      runBtn.innerHTML = 'pause';
      modeBtn.disabled = false;
      main();
    }
  }

  // Callback for switching to minimalist view
  function toggleView() {
    if (simpleView === false) {
      menuNode.className = 'effect-01b';
      footerNodes[0].className = 'effect-01b';
      panelNode.className = 'effect-01b';
      simpleView = true;
      modeBtn.disabled = true;
    }
    else {
      menuNode.className = 'effect-01a';
      footerNodes[0].className = 'effect-01a';
      panelNode.className = panelNode.className.replace('effect-01b', 'effect-01a');
      simpleView = false;
      modeBtn.disabled = false;
    }
  }

  // Starts the timer
  function start() {
    if (sessionMins && activeTimer === false) {
      var node = global.getComputedStyle(menuNode, null);
      var prop = node.getPropertyValue('display');
      
      if (prop === 'block' && openMenu === true) {
        togglePanel();
      }
      
      startTime = Date.now();
      passedTime = Date.now();
      animate = true;
      activeTimer = true;
      runBtn.innerHTML = 'pause';
      sessionPlus.disabled = true;
      sessionMinus.disabled = true;
      breakPlus.disabled = true;
      breakMinus.disabled = true;
      main();
    }
  }

  // Resets the timer for the next time interval
  function resetNewInterval() {
    startTime = Date.now();
    degrees = 0;
    passedTime = 0;
    pauseDuration = 0;
  }

  // Resets the timer completely, restoring the default timer values
  function hardReset() {
    animate = false;
    activeTimer = false;
    openMenu = true;
    simpleView = false;
    index = 0;
    sessionMins = 0;
    runBtn.innerHTML = 'start';
    degrees = 0;
    sessions = 0;
    paused = false;
    lastPauseTime = 0;
    pauseDuration = 0;
    color =  colors[0];
    panelNode.className = 'panel effect-01a';
    mode = mode || 'a';

    if (mode === 'a') {
      modeBtn.innerHTML = 'mode B';
    }
    else {
      modeBtn.innerHTML = 'mode A';
    }
    
    sessionMins = sessionMins || limits[0];
    sessionData.value = sessionMins;
    breakData.value = breakData.value || limits[1];
    modeBtn.disabled = false;
    sessionPlus.disabled = false;
    sessionMinus.disabled = false;
    breakPlus.disabled = false;
    breakMinus.disabled = false;
  }
  

/* Event handlers
------------------------------------------------------------------------------*/
  runBtn.onclick = function() { 
    if (simpleView === false) {
      if (activeTimer === false) {
        start();
      }
      else {
        togglePause();
      }
    }
  };

  resetBtn.onclick = function() {
    if (simpleView === false) {
      resetNewInterval();
      hardReset();
      update();
    }
  };

  modeBtn.onclick = function() {
    if (simpleView === false) {
      toggleMode();
      update();
    }
  };
  
  sessionPlus.onclick = function() { 
    adjustSessionTime(true);
    update();
  };

  sessionMinus.onclick = function() {
    adjustSessionTime(false);
    update();
  };
 
  breakPlus.onclick = function() {
    adjustBreakTime(true);
  };

  breakMinus.onclick = function() {
    adjustBreakTime(false);
  };
  
  canvas.ondblclick = function() {
    toggleView();
  };

  menuNode.onclick = togglePanel;

  global.onload = function() {
    hardReset();
    update();
  };

})(this);
