(function(global) {
  
  'use strict';

  // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
  // http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
  // requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
  // MIT license
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
        var currTime = new Date().getTime();
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
  
  
  // Canvas setup
  var canvas = document.createElement('canvas');
  var canvasBox = document.getElementById('canvas-box');
  var ctx = canvas.getContext('2d');
  canvasBox.appendChild(canvas);
  canvas.width = global.innerWidth;
  canvas.height = global.innerHeight;
  // var bgImg = new Image();
  // bgImg.src = 'assets/images/bg_egg-shell.png';
  
  var W = canvas.width;
  var H = canvas.height;
  var baseSize;
  
  if (W > H) {
    baseSize = H;
  } 
  else {
    baseSize = W;
  }
  
  // For timer calculations
  var startTime = null;
  var lastTime = 0;
  var min = null;
  var currentTime;
  var sessions = 0;

  // For graphics and animation
  var color = '#cf9';
  var index = 0;
  var colors = ['#cf9', '#fcc'];
  var degrees = 0;
  var clockStart = false;
  var animate = false;
  var fps = 30;
  var font = 'Oswald';

  // For pause feature
  var paused = false;
  var pauseStartTime = 0;
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
  var errorNode = document.getElementById('error-msg');

  // For switching to minimalist view
  var panelNode = document.getElementById('panel');
  var footerNodes = document.getElementsByTagName('footer');
  var simpleView = false;

  // For switching between timer styles
  var modeBtn = document.getElementById('btn-mode');
  var mode = 'a';

  // For opening and closing the panel in mobile view
  var menuNode = document.getElementById('menu');
  var openMenu = true;
 
  
/* Graphics
------------------------------------------------------------------------------*/

  //Renders texture background
  // function render_texture() {
  //   ctx.fillStyle = ctx.createPattern(bgImg, 'repeat');
  //   ctx.fillRect(0, 0, W, H);
  // }

  // Renders the timer progress bar for mode B
  // 1. Rate should be proportional to the specified time limit
  // 2. radians = angle in degrees * PI / 180
  // 3. Starting and ending angle adjusted to start at the top of the circle
  function render_progress_bar(curSec) {
    ctx.fillStyle = '#033';
    ctx.fillRect(0, 0, W, H);
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = baseSize * 0.03;
    ctx.beginPath();
    ctx.arc(W/2, H/2, (baseSize/2 - baseSize * 0.15),0,2*Math.PI);	// 3
    ctx.stroke();
    ctx.closePath();
    
    var rate = 360 / (60 * min); // 1
    var radians = null;
    degrees = curSec * rate;
    radians = degrees * Math.PI / 180; // 2
    ctx.strokeStyle = color;
    ctx.lineWidth = baseSize * 0.03;
    ctx.beginPath();
    ctx.arc(W/2, H/2, (baseSize/2 - baseSize * 0.15), 270 * Math.PI/180, radians + 270 * Math.PI/180, false);	// 3
    ctx.stroke();
    ctx.closePath();
  }

  // Renders background color shift for mode A
  function render_bg_animation(curSec) {
    
    // Used to calculate rate of color change
    var rate = parseFloat(curSec) / parseFloat(min * 60);
    var r, g, b, bgColor;
    
    // 1. Using the vales for teal rgb(0, 153, 153) and dark-red rgb(153, 0, 0)
    // 2. Take the difference of each rgb value and adjust the difference with the above calculated rate
    // 3. Subtract that difference from the teal values for the gradual color shift to light-red
    if (index === 0) {
      r = Math.floor(153 * rate);
      g = Math.floor(153 - 153 * rate);
      b = Math.floor(153 - 153 * rate);
      
      bgColor = 'rgb(' + r + ',' + g + ',' + b + ')';
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, W, H);
    }
    else {
      ctx.fillStyle='#900';
      ctx.fillRect(0, 0, W, H);
    }
  }

  // Converts total seconds to x:00:00 format and renders result
  // curSec: current time in seconds
  function render_timer(curSec) {
    curSec = curSec || 0;
    var fontSize;
    var txtWidth = '';
    var timePosX = (W/2);
    var time = '';
    var timeHr = '';
    var timeMin = Math.floor(((60 * min) - curSec) / 60);
    var timeSec = '00' + ((60 * min) - curSec) % 60;
    
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


/* Audio
------------------------------------------------------------------------------*/

  // Helper function for play_track, this determines which audio format is best for your browser
  function get_format_extension() {
    var audio = sfx;
    var extension;

    if (audio.canPlayType('audio/mp3') !== '') {
      extension = '.mp3';
    }
    else if (audio.canPlayType('audio/ogg') !== '') {
      extension = '.ogg';
    }
    else {
      errorNode.innerHTML = 'Unsupported audio format';
      errorNode.style.display = 'block';
    }
    return extension;
  }

  // Plays the alarm sound when the timer completes an interval
  function play_track() {
    if (sfxSrc) {
      sfx.src = sfxSrc + get_format_extension();
      sfx.load();
      sfx.play();
    }
    else {
      errorNode.innerHTML = 'Unable to load audio';
      errorNode.style.display = 'block';
    }
  }
  
  
/* Animation
------------------------------------------------------------------------------*/

  // Updates all the timer components, alternating between the
  // session and break data when the timer completes an interval
  function update(now) {
    currentTime = (now - startTime - pauseDuration) / 1000;

    if ((min * 60) - currentTime <= 0) {
      play_track();

      if (index === 0) {
        index = 1;
      }
      else {
        sessions++;
        index = 0;
      }

      min = limits[index];
      color = colors[index];
      soft_reset();
    }

    if (mode === 'a') {
      render_bg_animation(currentTime);
    }
    else {
      render_progress_bar(currentTime);
    }
    
    render_timer(parseInt(currentTime, 10));
  }

  // Continually calls itself until `animate === false`
  function main() {
    var now = Date.now();
    
    update(now);
    lastTime = now;
    
    if (animate) {
      global.setTimeout(function() { global.requestAnimationFrame(main); }, fps);
    }
  }

  
/* Controls and settings
------------------------------------------------------------------------------*/

  // Callback for switching between timer styles
  function toggle_mode() {
    if (mode === 'a') {
      mode = 'b';
      modeBtn.innerHTML = 'mode B';
    }
    else {
      mode = 'a';
      modeBtn.innerHTML = 'mode A';
    }
  }
  
  // Callback for initial timer and mode setting
  function select_mode() {
    min = sessionData.value;
    
    limits[0] = min;
    limits[1] = breakData.value;

    if (mode === 'a') {
      ctx.fillStyle = '#099';
      ctx.fillRect(0,0,W,H);
    }
    else {
      ctx.fillStyle = '#033';
      ctx.fillRect(0,0,W,H);
      render_progress_bar(0);
    }
    
    render_timer(0);
  }

  // Callback for opening and closing of panel in mobile view
  function toggle_panel() {
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
  function start_pause() {
    if (clockStart === true) {
      paused = !paused;
      runBtn.innerHTML = 'start';

      var now = new Date();

      if (animate === true) {
        pauseStartTime = now;
        animate = false;
        modeBtn.disabled = true;
      }
      else {
        runBtn.innerHTML = 'pause';
        pauseDuration += now - pauseStartTime;
        animate = true;
        modeBtn.disabled = false;
        main();
      }
    }
    else {
      start();
    }
  }

  // Callback for switching to minimalist view
  function toggle_view() {
    if (simpleView === false) {

      // Since we keep header hidden, need to disable this code
      // header[0].className = 'effect-01b';
      menuNode.className = 'effect-01b';
      footerNodes[0].className = 'effect-01b';
      panelNode.className = ' effect-01b';
      simpleView = true;
      modeBtn.disabled = true;
    }
    else {

      // header[0].className = 'effect-01a';
      menuNode.className = 'effect-01a';
      footerNodes[0].className = 'effect-01a';
      panelNode.className = panelNode.className.replace('effect-01b', 'effect-01a');
      simpleView = false;
      modeBtn.disabled = false;
    }
  }

  // Starts the timer
  function start() {
    if (min && clockStart === false) {
      var node = global.getComputedStyle(menuNode, null);
      var prop = node.getPropertyValue('display');
      
      if (prop === 'block' && openMenu === true) {
        toggle_panel();
      }
      
      startTime = new Date().getTime();
      animate = true;
      clockStart = true;
      runBtn.innerHTML = 'pause';
      sessionPlus.disabled = true;
      sessionMinus.disabled = true;
      breakPlus.disabled = true;
      breakMinus.disabled = true;
      main();
    }
  }

  // Resets the timer for the next time interval
  function soft_reset() {
    startTime = new Date().getTime();
    degrees = 0;
    lastTime = 0;
    pauseDuration = 0;
  }

  // Resets the timer completely, restoring the default timer values
  function hard_reset() {
    animate = false;
    clockStart = false;
    openMenu = true;
    index = 0;
    startTime = new Date().getTime();
    min = null;
    runBtn.innerHTML = 'start';
    degrees = 0;
    lastTime = 0;
    sessions = 0;
    paused = false;
    pauseStartTime = 0;
    pauseDuration = 0;
    color =  colors[0];
    panelNode.className = 'panel effect-01a';
    mode = mode || 'a';
    
    if (mode === 'a') {
      modeBtn.innerHTML = 'mode A';
    }
    else {
      modeBtn.innerHTML = 'mode B';
    }
    
    if (limits.length) {
      sessionData.value = limits[0];
      breakData.value = limits[1];
    }
    
    modeBtn.disabled = false;
    sessionPlus.disabled = false;
    sessionMinus.disabled = false;
    breakPlus.disabled = false;
    breakMinus.disabled = false;
    select_mode();
  }
  

/* Event handlers
------------------------------------------------------------------------------*/
  runBtn.onclick = function(e) { 
    if (simpleView === false) {
      start_pause();
    }
    else {
      e.preventDefault();
    }
  };

  resetBtn.onclick = function(e) {
    if (simpleView === false) {
      hard_reset();
    }
    else {
      e.preventDefault();
    }    
  };

  modeBtn.onclick = function(e) {
    if (simpleView === false) {
      toggle_mode();
      select_mode();
    }
    else {
      e.preventDefault();
    }    
  };
  
  menuNode.onclick = toggle_panel;
  
  sessionPlus.onclick = function(e) {
    sessionData.value++;
    
    if (parseInt(sessionData.value, 10) >= parseInt('1440', 10)) {
      sessionData.value = '1440';
    }
    
    select_mode();
  };
  
  sessionMinus.onclick = function(e) {
    if (sessionData.value > 1) {
      sessionData.value--;
      select_mode();
      
    }
  };
  
  breakPlus.onclick = function(e) {
    breakData.value++;
    
    if (parseInt(breakData.value, 10) >= parseInt('1440', 10)) {
      breakData.value = '1440';
    }
    
    select_mode();
  };
  
  breakMinus.onclick = function(e) {
    if (breakData.value > 1) {
      breakData.value--;
      select_mode();
    }
  };
  
  global.onkeydown = function(e) {
    if (e.keyCode === 32) {
      toggle_view();
    }
  };

  global.onload = hard_reset;

})(this);
