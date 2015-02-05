define(function(require,exports,module){
	require("RAF"); // 引入requestAnimationFrame
	var th = require("th"); // 引入TouchHelper模块
	// ---通用函数--- //
	function randInt(min,max){
		var min = min || 0,
			max = max || 1;
		return Math.round(Math.random()*(max-min)+min);
	}
	// ---Lookup Table--- //
	var atan = (function(){
		var t = {};
		for(var i=-100;i<=100;i++){
			t[i] = Math.atan(i/10);
		}
		return t;
	})();

	// ---游戏类--- //
	function Game(){
		// ---游戏参数与设置--- //
		var GameSelf = this, // 全局化this
			wsize = {
				x : $(window).width(),
				y : $(window).height()
			},
			wctr = {
				x : (wsize.x/2)>>0,
				y : (wsize.y/2)>>0
			},
			isAndroid = /android/gi.test(navigator.appVersion),
			isApple = /ipod|ipad|iphone/gi.test(navigator.appVersion),
			paused = true, // 是否暂停
			speed = 1, // 60fps，地图左移60px每秒
			readyCallback = null,
			level = 0,
			groundHeight = 0,
			gravity = 0.3,
			audioExt = ""!=(new Audio()).canPlayType('audio/ogg; codecs="vorbis"') ? ".ogg" : ".mp3",
			img = loadImg("style/images/atlas2.png"),
			sound = {
				die : loadSound("sound/sfx_hit"+audioExt),
				jump : loadSound("sound/sfx_wing"+audioExt),
				score : loadSound("sound/sfx_point"+audioExt)
			},
			resCount = isAndroid ? 4 : 1,
			resLoaded = 0,
			bgPos = 0,
			bgWidth = 288,
			bgHeight = 512,
			bgRatio = wsize.y/bgHeight,
			bgDrawHeight = wsize.y,
			bgDrawWidth = (bgWidth * bgRatio)>>0,
			bgCount = Math.ceil(wsize.x/(bgWidth*bgRatio)),
			blocks = [],
			blockWidth = 52,
			blockHeight = 320,
			blockSpeed = speed*3,
			blockMouthWidth = 130,
			blockMouthRand = 140,
			blockMouthOffset = -20,
			blockDist = 225,
			passedBlocks = 0,
			birdSize = 25,
			birdHalfSize = (birdSize/2)>>0,
			blockSprite = [[112,646],[168,646]],
			blockPassBorder = wctr.x-blockWidth,
			bird = null,
			birdJumpSpeed = -6,
			birdRightBorderPos = wctr.x+18,
			birdLeftBorderPos = wctr.x-18-blockWidth,
			birdGroundBorderPos = wsize.y-groundHeight-birdSize,
			blockCount = Math.ceil(wsize.x/blockDist),
			ratio = 1,
			lastTime = 0,
			stageModel = (function(){ // 触屏模型
				return new th(document.getElementById("stage"));
			})(),
			canvas = document.createElement("canvas"),
			ctx = canvas.getContext("2d");
		canvas.width = wsize.x;
		canvas.height = wsize.y;
		canvas.style.cssText = "width:"+wsize.x+"px;height:"+wsize.y+"px;";
			
		// 通用函数
		function loadImg(src){
			var i = document.createElement("img");
			i.src = src;
			i.onload = ready;
			return i;
		}
		function loadSound(src){
			var i = new Audio(),
				act = "oncanplaythrough" in window ? "canplaythrough" : "load";
			i.src = src;
			/*
			i.play = (function(){
				if(isApple){
					var t = document.createElement("a");
					a.onclick = i.play;
					$(a).css({
						width : 1,
						height :1,
						position : "absolute",
						right : 0,
						bottom :0
					});
					$("body").apped(a);
					return function(){
						$(a).trigger("click");
					}
				}else if(isAndroid){
					return i.play;
				}
			})();
			*/
			i.addEventListener(act,ready,false);
			return i;
		}
	
		// ---小鸟类--- //
		function Bird(){
			// 设置公共参数
			var BirdSelf = this;
			this.dead = false;
			this.deadTime = 0;
			this.deadGround = false;
			this.yspeed = 0;
			this.y = (wsize.y/2)>>0;
			this.sprite = [[230,762],[230,814],[230,866],[275,762]];
			this.spriteIndex = 0;
			this.direction = 0;
			this.size = {
				x : 35,
				y : 25
			};
			this.halfSize = {
				x : 18,
				y : 13
			};
			this.jump = function(){
				this.yspeed = birdJumpSpeed;
				if(isAndroid){
					sound.jump.currentTime = 0;
					sound.jump.play();
				}
			};
			this.move = function(){
				this.y = (this.y <= 0) ? this.yspeed : (this.y + this.yspeed);
				this.yspeed += gravity*ratio;
				this.direction = this.deadGround === false ? atan[(10*this.yspeed/blockSpeed)>>0] : Math.PI;
			};
			this.spriteTimer = (function(){
				BirdSelf.spriteIndex = BirdSelf.spriteIndex >= 2 ? 0 : (BirdSelf.spriteIndex+1);
				return setTimeout(arguments.callee,100);
			})();
		}
		// ---烟囱类--- //
		function Block(width,mouthWidth,mouthPos,initPos){
			// 设置公共参数
			var BlockSelf = this;
			this.width = width || blockWidth,
			this.mouthWidth = mouthWidth || blockMouthWidth,
			this.mouthPos = mouthPos || (wsize.y-this.mouthWidth-blockMouthRand)/2+blockMouthRand*Math.random()+blockMouthOffset;
			this.dead = false;
			this.pos = initPos || wsize.x;
			this.number = ++level;
			this.passed = false;
			this.move = function(){
				this.pos -= blockSpeed*ratio;
				if(this.pos<-this.width){
					this.dead = true;
				}
			};
		}


		// ---用户事件处理函数--- //
		function _tdown(){
			if(bird!==null){
				bird.jump();
			}
		}
		function _tup(){}
		function _tmove(e){
			var e = e || window.event;
			e.preventDefault();
		}

		// ---辅助函数--- //
		// 碰撞检测
		function _checkHit(){
			if(bird.y>birdGroundBorderPos){
				bird.dead = true;
				bird.deadGround = true;
				bird.deadTime=(+new Date)-1000;
				return;
			}
			for(var i=0,l=blocks.length;i<l;i++){
				if(blocks[i].passed===true) continue;
				if((blocks[i].pos<birdRightBorderPos)&&(blocks[i].pos>birdLeftBorderPos)){
					if((bird.y<blocks[i].mouthPos)||(bird.y+bird.size.y>blocks[i].mouthPos+blocks[i].mouthWidth)){
						if(!bird.dead){
							_stopReact();
							bird.dead = true;
							if(bird.deadTime===0) bird.deadTime = +new Date;
							if(isAndroid){
								sound.die.currentTime=0;
								sound.die.play();
							}
						}
						return;
					}
					break;
				}else if(blocks[i].pos<blockPassBorder){
					if(isAndroid){
						sound.score.currentTime = 0;
						sound.score.play();
					}
					blocks[i].passed = true;
					passedBlocks ++;
				}
			}
		}
		// 阻止游戏操作
		function _stopReact(){
			stageModel.ontouchstart = function(){};
			stageModel.ontouchmove = function(e){e.preventDefault()};
			stageModel.ontouchend = function(){};
		}
		// 响应用户操作
		function _react(){
			stageModel.ontouchstart = _tdown;
			stageModel.ontouchmove = _tmove;
			stageModel.ontouchend = _tup;
		}
		// 更新小鸟
		function _updateBird(){
			bird.move();
			if(bird.dead===true) bird.spriteIndex = 3;
			ctx.save();
			ctx.translate(wctr.x,bird.y+bird.halfSize.y);
			ctx.rotate(bird.direction);
			ctx.drawImage(img,bird.sprite[bird.spriteIndex][0],bird.sprite[bird.spriteIndex][1],bird.size.x,bird.size.y,-bird.halfSize.x,-bird.halfSize.y,bird.size.x,bird.size.y);
			ctx.restore();
		}
		// 更新烟囱
		function _updateBlock(){
			for(var i=0,l=blocks.length;i<l;i++){
				if(blocks[i].dead===true){
					blocks[i]={};
					blocks.splice(i,1);
					var k = new Block();
					k.pos = blocks[l-2].pos + blockDist;
					blocks.push(k);
					i--;

					// blocks[i].pos = blocks[l-2].pos + blockDist;
					// blocks[i].mouthPos = (wsize.y-this.mouthWidth)/2-50+100*Math.random();
					// blocks[i].number = ++level;
					// blocks[i].passed = false;
					// blocks.push(blocks.splice(i,1)[0]);
				}else{
					blocks[i].move();
					// ctx.save();
					ctx.drawImage(img,blockSprite[0][0],blockSprite[0][1],blockWidth,blockHeight,blocks[i].pos,blocks[i].mouthPos-blockHeight,blockWidth,blockHeight);
					ctx.drawImage(img,blockSprite[1][0],blockSprite[1][1],blockWidth,blockHeight,blocks[i].pos,blocks[i].mouthPos+blockMouthWidth,blockWidth,blockHeight);
				}
			}
		}


		// ---场景函数--- //
		// 渲染场景主循环
		function _render(){
			if(paused===false){
				// if(lastTime>0){
				// 	ratio = ((+new Date)-lastTime) / 18;
				// }else{
				// 	ratio = 1;
				// }
				// lastTime = +new Date;
				// 清屏
				_clearCanvas();
				// 碰撞检测
				_checkHit();

				if(bird.dead===true){
					if(bird.deadGround===true){
						gameover();
					}else{
						// 停止速度
						speed = 0;
						blockSpeed = 0;
					}
				}
				// 更新背景
				bgPos -= speed*ratio;
				if(!isAndroid){
					bgPos = bgPos<=-bgDrawWidth ? 0 : bgPos;
					for(var i=0;i<=bgCount;i++){
						ctx.drawImage(img,0,0,bgWidth,bgHeight,bgPos+bgDrawWidth*i,0,bgDrawWidth,bgDrawHeight);
					}
				}else{
					// bg.style.backgroundPosition = bgPos+"px 0";
				}

				// 更新烟囱
				_updateBlock();
				// 更新小鸟
				_updateBird();

				// 小鸟死了的动画
				if(bird.deadTime>0){
					var dtdiff = (+new Date) - bird.deadTime,
						dura = 250;
					if(dtdiff<dura){
						var opacity = (1-dtdiff/dura).toPrecision(1);
						ctx.save();
						ctx.fillStyle = "#fff";
						ctx.globalAlpha = opacity;
						ctx.fillRect(0,0,wsize.x,wsize.y);
						ctx.restore();
					}
				}
				
				ctx.save();
				ctx.fillStyle = "#fff";
				ctx.strokeStyle = "#F90";
				ctx.font = "normal bold 50px Verdana";
				ctx.fillText(passedBlocks,10,65);
				ctx.strokeText(passedBlocks,10,65);
				ctx.font = "normal bold 12px Verdana";
				ctx.fillText("Level",10,15);
				ctx.restore();
				
				requestNextAnimationFrame(arguments.callee);
			}
		}
		// canvas清屏
		function _clearCanvas(){
			// ctx.save();
			ctx.clearRect(0, 0, wsize.x, wsize.y);
			// ctx.restore();
		}
		// 重设场景
		function _resetStage(){
			// if(isAndroid){
			// 	$("#bg").remove();
			// }
			// 设置屏幕内容
			$("#game").append(canvas);
			_clearCanvas();

			$(".btn").css({
				left : "",
				top : "",
				right : 10,
				top : 10
			});
			$("#play").css({
				top : wsize.y/2 - 30,
				left : wsize.x/2 - 60
			});
			$("#reset").css({
				top : wsize.y/2 + 40,
				left : wsize.x/2 - 60
			});
			$("#level").css({
				top : wsize.y/2 - 40,
				left : wsize.x/2 - 100
			});
			$("#stage>div").css({
				width : wsize.x,
				height : wsize.y,
				position : "absolute",
				top : 0,
				left : 0
			}).each(function(){
				$(this).css("z-index",10-$(this).index());
			});
		}

		// ---控制函数--- //
		function init(){

			// 重设屏幕
			_resetStage();
			
			// 初始化元素
			speed = 1;
			blockSpeed = 3;
			bird = null;
			bird = new Bird();
			bgPos = 0;
			level = 0;
			blocks = (function(){
				var t=[],k=0;
				for(var i=0;i<blockCount;i++){
					(function(){
						k = new Block();
						k.pos = k.pos + (((i+0.5)*blockDist)>>0);
						t.push(k);
					})();
				}
				return t;
			})();
			passedBlocks = 0;
			window.addEventListener("resize",_resetStage,false);
			// 阻止用户操作
			_stopReact();
			$(".btn,.ldtxt").hide();
			$("#play").show();
			canvas.style.display = "block";
		}
		
		// 控制函数
		function ready(callback){
			if(typeof callback==="function"){
				if(resLoaded>=resCount){
					callback();
				}else{
					readyCallback = callback;
				}
			}else{
				resLoaded++;
				if((resLoaded>=resCount)&&(typeof readyCallback === "function")){
					readyCallback();
				}
			}
		}
		
		function play(){
			// 响应用户操作
			_react();
			paused = false;
			$("#mask,#reset,#play,#level").hide();
			//$("#pause").show();
			_render();
		}
		function pause(){
			// 阻止用户操作
			_stopReact();
			paused = true;
			$("#play,#mask").show();
			$("#pause").hide();
		}
		function reset(){
			if(isAndroid===true){
				location.reload();
			}else{
				init();
				play();
			}
		}
		function gameover(){
			// 阻止用户操作
			_stopReact();
			paused = true;
			$(".btn").hide();
			$("#level").html("Level <span>"+passedBlocks+"</span>");
			$("#reset,#mask,#level").show();
		}

		// 外部接口
		this.init = init;
		this.ready = ready;
		this.play = play;
		this.reset = reset;
		this.pause = pause;
		this.gameover = gameover;
	}
	module.exports = Game;
});