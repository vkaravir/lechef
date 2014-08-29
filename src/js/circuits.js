/* globals: $ */
var Utils = {
  extend: function(constructor, superConstructor) {
    function SurrogateConstructor() {}

    SurrogateConstructor.prototype = superConstructor.prototype;

    var prototypeObject = new SurrogateConstructor();
    prototypeObject.constructor = constructor;

    constructor.prototype = prototypeObject;
  }
};

var CIRCUIT_CONSTANTS = {
  VALCLASS: {true: "circuit-value-true",
            false: "circuit-value-false",
            UNKNOWN: "circuit-value-unknown",
            null: "circuit-value-unknown"},
  FEEDBACKCLASS: { true: "circuit-value-correct",
                  false: "circuit-value-incorrect"}
};

var CircuitConnection = function(outOf, outOfPos, into, intoPos) {
  this._outOf = outOf;
  this._outOfPos = outOfPos;
  this._into = into;
  this._intoPos = intoPos;
  var path = outOf.circuit._snap.path("M0 0 L 100 100");
  path.addClass("circuit-connector");
  this._path = path;
  this.positionPath();
};
CircuitConnection.prototype.positionPath = function() {
  var end = this._into._getInputLocation(this._intoPos);
  var start = this._outOf._getOutputLocation(this._outOfPos);
  var endPos = this._into.element.position();
  var startPos = this._outOf.element.position();
  var endX = end.x + endPos.left,
    endY = end.y + endPos.top,
    startX = start.x + startPos.left,
    startY = start.y + startPos.top,
    ctrl1X, ctrl2X;
  ctrl1X = startX + 80;
  ctrl2X = endX - 80;
  this._path.attr("path", "M" + startX + " " + startY + // move to the starting point
                    " C" + ctrl1X + " " + startY + // cubic bezier, first control point
                    " " + ctrl2X + " " + endY + // cubic bezier, second control point
                    " " + endX + " " + endY);
};
CircuitConnection.prototype.destroy = function() {
  this._path.remove();
};

// The super type for all the circuit components. No instances of
// this type should be directly created. Instead, you should create
// the actual components, like NotComponent.
//
// Subtypes should make sure they call the init(circuit, options)
// function in their constructor (unless you know what you're doing).
// Subtypes should also always implement two functions:
//  - drawComponent: this function should draw the shape of the component
//                  *and* position the input and output connector elements
//                  appropriately
//  - simulateOutput(input): this function should return the output of the
//                  component. Note, that the input (which is an object) isn't
//                  input for this component but for the whole circuit. You
//                  should thus pass the input downward in the circuit and ask
//                  the component's inputs to simulateOutput "recursively".
var CircuitComponent = function(circuit, options) {
  this.init(circuit, options);
};
var compproto = CircuitComponent.prototype;
// Initialized a circuit component. Circuit should be
// an instance of LogicCircuit. The options is an optional object configuring
// the component. Supported options are:
//  - inputCount:
//  - output:
//  - element:
//  - classNames:
compproto.init = function(circuit, options) {
  this.circuit = circuit;
  this.options = $.extend({draggable: true, clearFeedbackOnDrag: false, inputCount: 2, outputCount: 1}, options);
  var svgId = "LCC" + new Date().getTime();
  var element = $("<div><svg id='" + svgId +
                  "'></svg><span class='circuit-label'>" + this._componentName.toUpperCase() +
                                          "</span></div>");
  element.addClass("circuit-component");
  element.addClass("circuit-" + this._componentName);
  if (options && options.classNames) { element.addClass(options.classNames); }
  this.element = element;
  if (!this.options.element) {
    this.circuit.element.append(element);
  }
  if (!this.element[0].id) { this.element[0].id = "LC" + new Date().getTime(); }
  this._snap = new Snap("#" + svgId);
  if ("left" in this.options) { this.element.css("left", this.options.left); }
  if ("top" in this.options) { this.element.css("top", this.options.top); }

  this._outputs = [];
  this._outputpaths = [];
  this._outputElements = [];
  this._outputCount = this.options.outputCount;
  for (var i = 0; i < this._outputCount; i++) {
    var output = $("<div />");
    output.addClass("circuit-output");
    output.attr("data-pos", i);
    this.element.append(output);
    this._outputElements[i] = output;
  }

  this._inputElements = [];
  this._inputCount = this.options.inputCount;
  for (i = 0; i < this._inputCount; i++ ) {
    var input = $("<div />");
    input.addClass("circuit-input");
    input.attr("data-pos", i);
    this._inputElements[i] = input;
    this.element.append(input);
  }
  this._inputs = [];
  this._inputpaths = [];

  // draw the component shape inside the element
  this.drawComponent();

  // make draggable if option set
  if (this.options.draggable) {
    this._draggable();
  }
};
// dummy implementation for the drawComponent
compproto.drawComponent = function() {};
compproto._outputComponent = function(outpos, comp, path) {
  if (!this._outputs[outpos]) {
    this._outputs[outpos] = [];
    this._outputpaths[outpos] = [];
  }
  this._outputs[outpos].push(comp);
  this._outputpaths[outpos].push(path);
};
compproto.inputComponent = function(inpos, outpos, comp) {
  if (typeof outpos === "object") {
    comp = outpos;
    outpos = 0;
  }
  if (inpos >= this._inputCount || // invalid position, return
      outpos >= comp._outputCount) { return; }
  this.removeInput(inpos);

  this._inputs[inpos] = comp;
  var path = new CircuitConnection(comp, outpos, this, inpos);
  this._inputpaths[inpos] = path;
  comp._outputComponent(outpos, this, path);
};
compproto._removeOutput = function(comp) {
  for (var i = this._outputs.length; i--; ) {
    var ind = this._outputs[i].indexOf(comp);
    if (ind !== -1) {
      this._outputs[i].splice(ind, 1);
      this._outputpaths[i].splice(ind, 1);
    }
  }
};
compproto.removeInput = function(pos) {
  if (this._inputs[pos]) {
    this._inputs[pos]._removeOutput(this);
    this._inputpaths[pos].destroy();
    this._inputs[pos] = null;
    this._inputpaths[pos] = null;
  }
};
compproto._getOutputLocation = function(pos) {
  var e = this._outputElements[pos],
      ePos = e.position(),
      w = e.outerWidth(),
      h = e.outerHeight();
  return { x: ePos.left + w/2.0, y: ePos.top + h/2.0 };
};
compproto._getInputLocation = function(pos) {
  var e = this._inputElements[pos],
      ePos = e.position(),
      w = e.outerWidth(),
      h = e.outerHeight();
  return { x: ePos.left + w/2.0, y: ePos.top + h/2.0 };
};
compproto._positionHandles = function(drawLines) {
  this._positionInputHandles(drawLines);
  this._positionOutputHandles();
};
compproto._positionInputHandles = function(drawLines) {
  var w = this.element.outerWidth(),
    h = this.element.outerHeight(),
    i = this._inputCount,
    inputspacing = 0.8*h / (i + 1);
  if (drawLines) {
    for (; i--;) {
      this._snap.line(0, 0.1 * h + inputspacing * (i + 1), 0.2 * w, 0.1 * h + inputspacing * (i + 1));
    }
  }
  for (i = 0; i < this._inputCount; i++) {
    var ie = this._inputElements[i];
    ie.css("top", (0.1 * h + inputspacing * (i + 1) - ie.outerHeight() / 2.0) + "px");
  }
};
compproto._positionOutputHandles = function() {
  var w = this.element.outerWidth(),
    h = this.element.outerHeight(),
    i = this._outputCount,
    outputspacing = 0.8*h / (i + 1);
  for (i = 0; i < this._outputCount; i++) {
    var oe = this._outputElements[i];
    oe.css("top", (0.1*h) + outputspacing*(i+1) - oe.outerHeight()/2.0 + "px");
  }
};
compproto.layout = function() {
  for (var i = this._inputs.length; i--; ) {
    var input = this._inputs[i],
        inputpath = this._inputpaths[i];
    if (input && inputpath) {
      inputpath.positionPath();
    }
  }
  var outs;
  for (i = this._outputs.length; i--; ) {
    outs = this._outputs[i];
    if (!outs) { continue; }
    for (var j = 0; j < outs.length; j++) {
      var output = outs[j],
           outputpath = this._outputpaths[i][j];
      if (output && outputpath) {
        outputpath.positionPath();
      }
    }
  }
};
compproto.validateInputs = function() {
  var valid = true;
  for (var i = this._inputCount; i--; ) {
    var input = this._inputs[i];
    if (!input) {
      this._inputElements[i].addClass("circuit-missing");
      valid = false;
    } else {
      valid = input.validateInputs() && valid;
    }
  }
  return valid;
};
compproto.state = function() {
  return $.extend({name: this._componentName},
                  this.options,
                  {left: this.element.css("left"), top: this.element.css("top")});
};
compproto._draggable = function() {
  this.element.draggable({
    start: function() {
      if (this.options.clearFeedbackOnDrag) {
        self.circuit.clearFeedback();
      }
    }.bind(this),
    drag: function() {
      this.layout();
    }.bind(this),
    stop: function() {
      this.circuit.element.trigger("circuit-changed");
    }.bind(this)
  });
};

var CircuitAndComponent = function(circuit, options) {
  this._componentName = "and";
  this.init(circuit, options);
};
Utils.extend(CircuitAndComponent, CircuitComponent);
CircuitAndComponent.prototype.drawComponent = function() {
  var w = this.element.outerWidth(),
      h = this.element.outerHeight();
  path = this._snap.path("M" + 0.2*w + "," + 0.1*h + // move to x y
                         " L" + 0.5*w + "," + 0.1*h + // line to x y
                         " A" + 0.4*h + "," + 0.4*h + " 0 0 1 " +
                                0.5*w + "," + 0.9*h +
                         " L" + 0.2*w + "," + 0.9*h + "Z");
  this._snap.line(0.8*w-5, 0.5*h, w, 0.5*h);

  this._positionHandles(true);
};
CircuitAndComponent.prototype.simulateOutput = function(input) {
  var result = true;
  for (var i = 0; i < this._inputs.length; i++) {
    var res = this._inputs[i].simulateOutput(input);
    this._inputElements[i].addClass(CIRCUIT_CONSTANTS.VALCLASS[res]);
    result = result && res;
  }
  this._outputElements[0].addClass(CIRCUIT_CONSTANTS.VALCLASS[result]);
  return result;
};

var CircuitNandComponent = function(circuit, options) {
  this._componentName = "nand";
  this.init(circuit, options);
};
Utils.extend(CircuitNandComponent, CircuitComponent);
CircuitNandComponent.prototype.drawComponent = function() {
  var w = this.element.outerWidth(),
      h = this.element.outerHeight();
  path = this._snap.path("M" + 0.2*w + " " + 0.1*h + // move to x y
                        " L" + 0.5*w + " " + 0.1*h + // line to x y
                        " A" + 0.4*h + " " + 0.4*h + " 0 0 1 " +
                        0.5*w + " " + 0.9*h +
                        " L" + 0.2*w + " " + 0.9*h + "Z");
  this._snap.line(0.9*w-5, 0.5*h, w, 0.5*h);
  this._snap.circle(0.8*w + 3, 0.5*h, 8);

  this._positionHandles(true);
};
CircuitNandComponent.prototype._andSimulateOutput = CircuitAndComponent.prototype.simulateOutput;
CircuitNandComponent.prototype.simulateOutput = function(input) {
  var out = !this._andSimulateOutput(input);
  this._outputElements[0]
              .removeClass(CIRCUIT_CONSTANTS.VALCLASS[false] + " " + CIRCUIT_CONSTANTS.VALCLASS[true])
              .addClass(CIRCUIT_CONSTANTS.VALCLASS[out]);
  return out;
};

var CircuitNotComponent = function(circuit, options) {
  this._componentName = "not";
  var opts = $.extend({inputCount: 1}, options);
  this.init(circuit, opts);
};
Utils.extend(CircuitNotComponent, CircuitComponent);
CircuitNotComponent.prototype.drawComponent = function() {
  var w = this.element.outerWidth(),
      h = this.element.outerHeight();

  this._snap.circle(0.7*w + 7, 0.5*h, 8);
  this._snap.polygon([0.2*w, 0.1*h, 0.2*w, 0.9*h, 0.7*w, 0.5*h]);
  this._snap.line(0.7*w + 16, 0.5*h, w, 0.5*h);

  this._positionHandles(true);
};
CircuitNotComponent.prototype.simulateOutput = function(input) {
  var inp = this._inputs[0].simulateOutput(input);
  this._inputElements[0].addClass(CIRCUIT_CONSTANTS.VALCLASS[inp]);
  this._outputElements[0].addClass(CIRCUIT_CONSTANTS.VALCLASS[!inp]);
  return !inp;
};

var CircuitOrComponent = function(circuit, options) {
  this._componentName = "or";
  this.init(circuit, options);
};
Utils.extend(CircuitOrComponent, CircuitComponent);
CircuitOrComponent.prototype.drawComponent = function() {
  var w = this.element.outerWidth(),
      h = this.element.outerHeight();
  this._snap.line(0.7*w + 16, 0.5*h, w, 0.5*h);
  this._snap.path("M" + 0.2*w + " " + 0.1*h + // move to x y)
                  " Q" + 0.6*w + " " + 0.15*h + " " + 0.8*w + " " + 0.5*h +
                  " Q" + 0.6*w + " " + 0.85*h + " " + 0.2*w + " " + 0.9*h +
                  " Q" + 0.3*w + " " + 0.5*h + " " + 0.2*w + " " + 0.1*h);

  var i = this._inputCount,
      inputspacing = 0.8*h / (i + 1);
  for (; i--;) {
    // magic number 5; should calculate the intersection of the bezier and the line
    this._snap.line(0, 0.1 * h + inputspacing * (i + 1), 0.2 * w + 5, 0.1 * h + inputspacing * (i + 1));
  }

  this._positionHandles(false);
};
CircuitOrComponent.prototype.simulateOutput = function(input) {
  var result = this._inputs[0].simulateOutput(input);
  this._inputElements[0].addClass(CIRCUIT_CONSTANTS.VALCLASS[result]);
  for (var i = 1; i < this._inputCount; i++) {
    var inp = this._inputs[i].simulateOutput(input);
    this._inputElements[i].addClass(CIRCUIT_CONSTANTS.VALCLASS[inp]);
    result = result || inp;
  }
  this._outputElements[0].addClass(CIRCUIT_CONSTANTS.VALCLASS[result]);
  return result;
};

var CircuitNorComponent = function(circuit, options) {
  this._componentName = "nor";
  this.init(circuit, options);
};
Utils.extend(CircuitNorComponent, CircuitComponent);
CircuitNorComponent.prototype.drawComponent = function() {
  var w = this.element.outerWidth(),
      h = this.element.outerHeight();
  this._snap.line(0.75*w + 16, 0.5*h, w, 0.5*h);
  this._snap.path("M" + 0.2*w + " " + 0.1*h + // move to x y)
                  " Q" + 0.5*w + " " + 0.15*h + " " + 0.75*w + " " + 0.5*h +
                  " Q" + 0.5*w + " " + 0.85*h + " " + 0.2*w + " " + 0.9*h +
                  " Q" + 0.3*w + " " + 0.5*h + " " + 0.2*w + " " + 0.1*h);
  this._snap.circle(0.75*w + 8, 0.5*h, 8);

  var i = this._inputCount,
    inputspacing = 0.8*h / (i + 1);
  for (; i--;) {
    // magic number 5; should calculate the intersection of the bezier and the line
    this._snap.line(0, 0.1 * h + inputspacing * (i + 1), 0.2 * w + 5, 0.1 * h + inputspacing * (i + 1));
  }

  this._positionHandles(false);
};
// output simulation; reuse what the or component would return and negate it
CircuitNorComponent.prototype._orSimulateOutput = CircuitOrComponent.prototype.simulateOutput;
CircuitNorComponent.prototype.simulateOutput = function(input) {
  var result = !this._orSimulateOutput(input);
  this._outputElements[0]
        .removeClass(CIRCUIT_CONSTANTS.VALCLASS[false] + " " + CIRCUIT_CONSTANTS.VALCLASS[true])
        .addClass(CIRCUIT_CONSTANTS.VALCLASS[result]);
  return result;
};


var CircuitXorComponent = function(circuit, options) {
  this._componentName = "xor";
  this.init(circuit, options);
};
Utils.extend(CircuitXorComponent, CircuitComponent);
CircuitXorComponent.prototype.drawComponent = function() {
  var w = this.element.outerWidth(),
    h = this.element.outerHeight();
  this._snap.line(0.75*w + 16, 0.5*h, w, 0.5*h);
  this._snap.path("M" + 0.25*w + " " + 0.1*h + // move to x y)
                  " Q" + 0.6*w + " " + 0.15*h + " " + 0.85*w + " " + 0.5*h +
                  " Q" + 0.6*w + " " + 0.85*h + " " + 0.25*w + " " + 0.9*h +
                  " Q" + 0.35*w + " " + 0.5*h + " " + 0.25*w + " " + 0.1*h);
  this._snap.path("M" + 0.2*w + " " + 0.1*h +
                  " Q" + 0.3*w + " " + 0.5*h + " " + 0.2*w + " " + 0.9*h);
  var i = this._inputCount,
    inputspacing = 0.8*h / (i + 1);
  for (; i--;) {
    // magic number 5; should calculate the intersection of the bezier and the line
    this._snap.line(0, 0.1 * h + inputspacing * (i + 1), 0.2 * w + 5, 0.1 * h + inputspacing * (i + 1));
  }

  this._positionHandles(false);
};
CircuitXorComponent.prototype.simulateOutput = function(input) {
  var in1 = this._inputs[0].simulateOutput(input);
  this._inputElements[0].addClass(CIRCUIT_CONSTANTS.VALCLASS[in1]);
  var in2 = this._inputs[1].simulateOutput(input);
  this._inputElements[1].addClass(CIRCUIT_CONSTANTS.VALCLASS[in2]);
  var out = ( in1 && !in2 ) || ( !in1 && in2 );
  this._outputElements[0].addClass(CIRCUIT_CONSTANTS.VALCLASS[out]);
  return out;
};

var CircuitEqvComponent = function(circuit, options) {
  this._componentName = "eqv";
  this.init(circuit, options);
};
Utils.extend(CircuitEqvComponent, CircuitComponent);
CircuitEqvComponent.prototype.drawComponent = function() {
  var w = this.element.outerWidth(),
    h = this.element.outerHeight();
  this._snap.line(0.75*w + 16, 0.5*h, w, 0.5*h);
  this._snap.path("M" + 0.25*w + " " + 0.1*h + // move to x y)
                  " Q" + 0.6*w + " " + 0.15*h + " " + 0.75*w + " " + 0.5*h +
                  " Q" + 0.6*w + " " + 0.85*h + " " + 0.25*w + " " + 0.9*h +
                  " Q" + 0.35*w + " " + 0.5*h + " " + 0.25*w + " " + 0.1*h);
  this._snap.path("M" + 0.2*w + " " + 0.1*h +
                  " Q" + 0.3*w + " " + 0.5*h + " " + 0.2*w + " " + 0.9*h);
  this._snap.circle(0.75*w + 8, 0.5*h, 8);
  var i = this._inputCount,
    inputspacing = 0.8*h / (i + 1);
  for (; i--;) {
    // magic number 5; should calculate the intersection of the bezier and the line
    this._snap.line(0, 0.1 * h + inputspacing * (i + 1), 0.2 * w + 5, 0.1 * h + inputspacing * (i + 1));
  }

  this._positionHandles(false);
};
CircuitEqvComponent.prototype._xorSimulateOutput = CircuitXorComponent.prototype.simulateOutput;
CircuitEqvComponent.prototype.simulateOutput = function(input) {
  var result = !this._xorSimulateOutput(input);
  this._outputElements[0]
        .removeClass(CIRCUIT_CONSTANTS.VALCLASS[false] + " " + CIRCUIT_CONSTANTS.VALCLASS[true])
        .addClass(CIRCUIT_CONSTANTS.VALCLASS[result]);
  return result;
};
// component for input for the circuit
var CircuitInputComponent = function(circuit, options) {
  this._componentName = options.componentName || "INPUT";
  options.classNames = (options.classNames || "") + " circuit-input-component";
  this.init(circuit, options);
};
Utils.extend(CircuitInputComponent, CircuitComponent);
CircuitInputComponent.prototype.drawComponent = function() {
  var w = this.element.outerWidth(),
      h = this.element.outerHeight();
  this._snap.line(0.6*w, 0.5*h, w, 0.5*h);
  this._snap.rect(2, 0.2*h, 0.6*w, 0.6*h);
};
CircuitInputComponent.prototype.simulateOutput = function(input) {
  var inp = input[this._componentName];
  this._outputElements[0].addClass(CIRCUIT_CONSTANTS.VALCLASS[inp]);
  return inp;
};
CircuitInputComponent.prototype.state = function() {
  return $.extend({name: "input", componentName: this._componentName}, this.options,
        { left: this.element.css("left"), top: this.element.css("top")});
};

// component for output of the circuit
var CircuitOutputComponent = function(circuit, options) {
  this._componentName = options.componentName || "OUTPUT";
  options.classNames = (options.classNames || "") + " circuit-output-component";
  this.init(circuit, options);
};
Utils.extend(CircuitOutputComponent, CircuitComponent);
CircuitOutputComponent.prototype.drawComponent = function() {
  var w = this.element.outerWidth(),
      h = this.element.outerHeight();
  this._snap.line(0, 0.5*h, 0.4*w - 5, 0.5*h);
  this._snap.rect(0.4*w - 5, 0.2*h, 0.6*w, 0.6*h);
  this._positionHandles(false);
};
CircuitOutputComponent.prototype.simulateOutput = function(input) {
  var valid = this.validateInputs();
  if (!valid) { return null; }

  var result = this._inputs[0].simulateOutput(input);
  this._inputElements[0].addClass(CIRCUIT_CONSTANTS.VALCLASS[result]);
  return result;
};
CircuitOutputComponent.prototype.state = function() {
  return $.extend({name: "output", componentName: this._componentName, left: this.element.css("left"),
    top: this.element.css("top")}, this.options);
};

CircuitHalfAdderComponent = function(circuit, options) {
  var opts = $.extend({outputCount: 2}, options);
  this._componentName = "halfadder";
  this.init(circuit, opts);
  this.element.find(".circuit-label").html("&frac12;");
};
Utils.extend(CircuitHalfAdderComponent, CircuitComponent);
CircuitHalfAdderComponent.prototype.drawComponent = function() {
  var w = this.element.outerWidth(),
      h = this.element.outerHeight();
  // output line
  this._snap.line(0.7*w, 0.5*h, w, 0.5*h);
  // output line downward
  this._snap.line(0.45*w, 0.8*h, 0.45*w, h);
  // the component "body"
  this._snap.rect(0.2*w, 0.2*h, 0.5*w, 0.6*h);

  this._positionInputHandles(true);
  this._outputElements[0].css({"top": 0.5*h - 0.5*this._outputElements[0].outerHeight(),
                                "right": -0.5*this._outputElements[0].outerWidth()});
  this._outputElements[1].css({"bottom": -0.5*this._outputElements[1].outerHeight(),
                                "left": 0.45*w - 0.5*this._outputElements[1].outerWidth()});
};
CircuitHalfAdderComponent.prototype.simulateOutput = function(input) {
  var inp0 = this._inputs[0].simulateOutput(input);
  this._inputElements[0].addClass(CIRCUIT_CONSTANTS.VALCLASS[inp0]);
  var inp1 = this._inputs[1].simulateOutput(input);
  this._inputElements[1].addClass(CIRCUIT_CONSTANTS.VALCLASS[inp1]);
  var res0 = (inp0 || inp1) && !(inp0 && inp1),
      res1 = inp0 && inp1;
  this._outputElements[0].addClass(CIRCUIT_CONSTANTS.VALCLASS[res0]);
  this._outputElements[1].addClass(CIRCUIT_CONSTANTS.VALCLASS[res1]);
  return [res0, res1];
};

CircuitHalfSubstractorComponent = function(circuit, options) {
  var opts = $.extend({outputCount: 2}, options);
  this._componentName = "halfsubstractor";
  this.init(circuit, opts);
  this.element.find(".circuit-label").html("-&frac12;")
};
Utils.extend(CircuitHalfSubstractorComponent, CircuitHalfAdderComponent);
CircuitHalfSubstractorComponent.prototype.simulateOutput = function(input) {
  var inp0 = this._inputs[0].simulateOutput(input);
  this._inputElements[0].addClass(CIRCUIT_CONSTANTS.VALCLASS[inp0]);
  var inp1 = this._inputs[1].simulateOutput(input);
  this._inputElements[1].addClass(CIRCUIT_CONSTANTS.VALCLASS[inp1]);
  var res0 = (inp0 || inp1) && !(inp0 && inp1),
      res1 = !inp0 && inp1;
  this._outputElements[0].addClass(CIRCUIT_CONSTANTS.VALCLASS[res0]);
  this._outputElements[1].addClass(CIRCUIT_CONSTANTS.VALCLASS[res1]);
  return [res0, res1];
};

var LogicCircuit = function(options) {
  this.element = options.element || $("<div />");
  if (!options.element) {
    this.element.appendTo(document.body);
  }
  var svgId = "LC" + new Date().getTime();
  this.element.append("<svg id='" + svgId + "'></svg>");
  this._snap = new Snap("#" + svgId);
  this.element.addClass("circuit");
  this._components = [];
};
var logicproto = LogicCircuit.prototype;
logicproto.andComponent = function(options) {
  var comp = new CircuitAndComponent(this, options);
  this._components.push(comp);
  return comp;
};
logicproto.nandComponent = function(options) {
  var comp = new CircuitNandComponent(this, options);
  this._components.push(comp);
  return comp;
};
logicproto.notComponent = function(options) {
  var comp = new CircuitNotComponent(this, options);
  this._components.push(comp);
  return comp;
};
logicproto.orComponent = function(options) {
  var comp = new CircuitOrComponent(this, options);
  this._components.push(comp);
  return comp;
};
logicproto.norComponent = function(options) {
  var comp = new CircuitNorComponent(this, options);
  this._components.push(comp);
  return comp;
};
logicproto.xorComponent = function(options) {
  var comp = new CircuitXorComponent(this, options);
  this._components.push(comp);
  return comp;
};
logicproto.eqvComponent = function(options) {
  var comp = new CircuitEqvComponent(this, options);
  this._components.push(comp);
  return comp;
};
logicproto.inputComponent = function(label, options) {
  var opts = $.extend({inputCount: 0, componentName: label}, options);
  var comp = new CircuitInputComponent(this, opts);
  if (!this._inputs) {
    this._inputs = {};
  }
  this._components.push(comp);
  this._inputs[label] = comp;
  return comp;
};
logicproto.outputComponent = function(label, options) {
  var opts = $.extend({outputCount: 0, inputCount: 1, componentName: label}, options);
  var comp = new CircuitOutputComponent(this, opts);
  if (!this._outputs) { this._outputs = {}; }
  this._components.push(comp);
  this._outputs[label] = comp;
  return comp;
};
logicproto.halfAdderComponent = function(options) {
  var comp = new CircuitHalfAdderComponent(this, options);
  this._components.push(comp);
  return comp;
};
logicproto.halfSubstractorComponent = function(options) {
  var comp = new CircuitHalfSubstractorComponent(this, options);
  this._components.push(comp);
  return comp;
};
logicproto.simulateOutput = function(input) {
  var result = {},
      outs = this._outputs;
  for (var output in outs) {
    if (outs.hasOwnProperty(output)) {
      result[output] = outs[output].simulateOutput(input);
    }
  }
  return result;
};
logicproto.clearFeedback = function() {
  var fbClasses = ["circuit-missing", CIRCUIT_CONSTANTS.VALCLASS[false], CIRCUIT_CONSTANTS.VALCLASS[true]];
  this.element.find("." + fbClasses.join(",.")).removeClass(fbClasses.join(' '));
};
logicproto.state = function(newState) {
  var state, c, i, j, newC;
  if (typeof newState === "undefined") { // return state
    state = {components: [], connections: []};
    for (i = 0; i < this._components.length; i++) {
      c = this._components[i];
      state.components.push(c.state());
    }
    for (i = 0; i < this._components.length; i++) {
      c = this._components[i];
      for (j = 0; j < c._inputs.length; j++) {
        state.connections.push({to: i, from: this._components.indexOf(c._inputs[j]),
                                topos: j, frompos: c._inputpaths[j]._outOfPos});
      }
    }
    return state;
  } else { // set current state
    for (i = 0; i < newState.components.length; i++) {
      c = newState.components[i];
      if (c.name === "input") {
        newC = this.inputComponent("", c);
      } else if (c.name === "output") {
        newC = this.outputComponent("", c);
      } else {
        newC = this[c.name + "Component"](c);
      }
    }
    for (i = 0; i < newState.connections.length; i++) {
      c = newState.connections[i];
      this._components[c.to].inputComponent(c.topos, c.frompos, this._components[c.from]);
    }
  }
};