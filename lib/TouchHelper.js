define(function(require,exports,module){
    // require 加载外部模块
    // exports 作为输出接口
    // module.exports 输出整个模块（其他模块require加载时的返回值）
    function TouchHelper(f, m, l, k) {
        // f : object
        // m : touchstart function
        // l : touchmove function
        // k : touchend function
        if (!f) {
            return;
        }
        var d = function() {};
        this.obj = f;
        this.ontouchstart = typeof m == "function" ? m :d;
        this.ontouchmove = typeof l == "function" ? l :d;
        this.ontouchend = typeof k == "function" ? k :d;
        this.has3d = "WebKitCSSMatrix" in window && "m11" in new WebKitCSSMatrix();
        this.helper3d = {
            before:this.has3d ? "3d" :"",
            after:this.has3d ? ",0" :""
        };
        this.vendor = function() {
            var o = document.createElement("div").style;
            return "webkitTransform" in o ? "webkit" :"MozTransform" in o ? "Moz" :"msTransform" in o ? "ms" :"OTransform" in o ? "O" :"";
        }();
        this.cssVendor = this.vendor ? "-" + this.vendor.toLowerCase() + "-" :"";
        this.ontransitionend = "ontransitionend" in this.obj;
        var i = this,
		e = "ontouchstart" in window,
		ee = "onmspointerdown" in window,
		g = e ? "touchstart" : (ee ? "mspointerdown" : "mousedown"),
		h = e ? "touchmove" :(ee?"mspointermove":"mousemove"),
		c = e ? "touchend" :(ee?"mspointerup":"mouseup"),
		n = e ? "touchcancel" :(ee?"mspointercancel":"mouseout"),
		j = function(o) {
            var o = o || window.event, p = e ? o.touches[0] :o;
            i.state = {
                touching:true,
                swipeLeft:false,
                swipeRight:false,
                moving:false
            };
            i.startData = {
                x:p.clientX,
                y:p.clientY,
                timestamp:+new Date()
            };
            i.swipeDir = {
                defined:false
            };
            i.moveData = {
                x:p.clientX,
                y:p.clientY,
                timestamp:+new Date(),
                speed:{}
            };
            i.diff = {};
            i.diff.speed = {};
            i.ontouchstart(o);
        }, b = function(o) {
            if (i.state && i.state.touching === true) {
                var o = o || window.event, p = e ? o.touches[0] :o;
                i.state.moving = false;
                i.moveData.speed.x = (p.clientX - i.moveData.x) / (+new Date() - i.moveData.timestamp);
                i.moveData.speed.y = (p.clientY - i.moveData.y) / (+new Date() - i.moveData.timestamp);
                if (i.swipeDir.defined === false) {
                    i.swipeDir.x = Math.abs(i.moveData.speed.x) / Math.abs(i.moveData.speed.y) > 10 / 8;
                    i.swipeDir.y = !i.swipeDir.x;
                    i.swipeDir.defined = true;
                }
                i.moveData.x = p.clientX;
                i.moveData.y = p.clientY;
                i.diff.x = i.moveData.x - i.startData.x;
                i.diff.y = i.moveData.y - i.startData.y;
                i.ontouchmove(o);
            }
        }, a = function(o) {
            if (i.state && i.state.touching === true) {
                var o = o || window.event;
                i.diff.timestamp = +new Date() - i.startData.timestamp;
                i.diff.speed.x = i.diff.x / i.diff.timestamp;
                i.diff.speed.y = i.diff.y / i.diff.timestamp;
                i.state.touching = false;
                i.state.moving = false;
                i.state.swipeLeft = i.diff.speed.x < -(1 / 3) && i.swipeDir.x;
                i.state.swipeRight = i.diff.speed.x > 1 / 3 && i.swipeDir.x;
                i.ontouchend(o);
            }
        };
        f.addEventListener(g, j, false);
        f.addEventListener(h, b, false);
        f.addEventListener(c, a, false);
        f.addEventListener(n, a, false);
        if (!TouchHelper.prototype.prefixStyle) {
            TouchHelper.prototype.prefixStyle = function(o) {
                return this.vendor + o;
            };
        }
    }
    // 模块直接输出整个函数
    module.exports = TouchHelper;
});