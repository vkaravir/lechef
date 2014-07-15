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
  this.options = $.extend({draggable: true, clearFeedbackOnDrag: false, inputCount: 2, output: true}, options);
  var svgId = "LCC" + new Date().getTime();
  var element = $("<div><svg id='" + svgId +
                  "'></svg><span class='circuit-label'>" + this._componentName.toUpperCase() +
                                          "</span></div>");
  element.addClass("circuit-component");
  element.addClass("circuit-" + this._componentName);
  if (options && options.classNames) { element.addClass(options.classNames); }
  //element.html(CIRCUIT_SHAPES[this._componentName]);
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
  if (this.options.output) {
    var output = $("<div />");
    output.addClass("circuit-output");
    this.element.append(output);
    this._outputElement = output;
  } else {
    this._outputElement = $();
  }

  this._inputElements = [];
  this._inputCount = this.options.inputCount;
  for (var i = 0; i < this._inputCount; i++ ) {
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
compproto._outputComponent = function(comp, path) {
  this._outputs.push(comp);
  this._outputpaths.push(path);
};
compproto.inputComponent = function(pos, comp) {
  if (pos >= this._inputCount) { return; } // invalid position, return
  this.removeInput(pos);

  this._inputs[pos] = comp;
  var path = this._createPath(pos, comp);
  this._inputpaths[pos] = path;
  comp._outputComponent(this, path);
};
compproto._removeOutput = function(comp) {
  var i = this._outputs.indexOf(comp);
  this._outputs.splice(i, 1);
  this._outputpaths.splice(i, 1);
};
compproto.removeInput = function(pos) {
  if (this._inputs[pos]) {
    this._inputs[pos]._removeOutput(this);
    this._inputpaths[pos].remove();
    this._inputs[pos] = null;
    this._inputpaths[pos] = null;
  }
};
compproto._createPath = function(pos, comp) {
  var path = this.circuit._snap.path("M0 0 L 100 100");
  this._positionPath(pos, comp, path);
  path.addClass("circuit-connector");
  return path;
};
compproto._positionPath = function(pos, comp, path) {
  var end = this._getInputLocation(pos);
  var start = comp._getOutputLocation();
  var myPos = this.element.position();
  var compPos = comp.element.position();
  var endX = end.x + myPos.left,
    endY = end.y + myPos.top,
    startX = start.x + compPos.left,
    startY = start.y + compPos.top,
    ctrl1X, ctrl2X;
  ctrl1X = startX + 80;
  ctrl2X = endX - 80;
  path.attr("path", "M" + startX + " " + startY + // move to the starting point
    " C" + ctrl1X + " " + startY + // cubic bezier, first control point
    " " + ctrl2X + " " + endY + // cubic bezier, second control point
    " " + endX + " " + endY);
};
compproto._getOutputLocation = function() {
  return {x: this.element.outerWidth(), y: 0.5*this.element.outerHeight()};
};
compproto._getInputLocation = function(pos) {
  var h = this.element.outerHeight();
  return {x: 0, y: 0.1*h + 0.8*h / (this._inputCount + 1)*(pos+1)};
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
  this.element.find(".circuit-input").each(function(index, item) {
    $(item).css("top", (0.1*h + inputspacing*(index+1) - $(item).outerHeight()/2.0) + "px");
  });
};
compproto.layout = function() {
  for (var i = 0; i < this._inputs.length; i++) {
    var input = this._inputs[i],
        inputpath = this._inputpaths[i];
    if (input && inputpath) {
     this._positionPath(i, input, inputpath);
    }
  }
  for (i = 0; i < this._outputs.length; i++) {
    var output = this._outputs[i],
        outputpath = this._outputpaths[i];
    if (output && outputpath) {
      output._positionPath(output._inputs.indexOf(this), this, outputpath);
    }
  }
};
compproto.validateInputs = function() {
  var valid = true;
  for (var i = this._inputCount; i--; ) {
    var input = this._inputs[i];
    if (!input) {
      this.element.find(".circuit-input[data-pos=" + i + "]").addClass("circuit-missing");
      valid = false;
    } else {
      valid = input.validateInputs() && valid;
    }
  }
  return valid;
};
compproto.state = function() {
  return $.extend({name: this._componentName, left: this.element.css("left"),
          top: this.element.css("top")}, this.options);
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
  console.log(this._snap);
  path = this._snap.path("M" + 0.2*w + "," + 0.1*h + // move to x y
                         " L" + 0.5*w + "," + 0.1*h + // line to x y
                         " A" + 0.4*h + "," + 0.4*h + " 0 0 1 " +
                                0.5*w + "," + 0.9*h +
                         " L" + 0.2*w + "," + 0.9*h + "Z");
  this._snap.line(0.8*w-5, 0.5*h, w, 0.5*h);

  this._positionInputHandles(true);
};
CircuitAndComponent.prototype.simulateOutput = function(input) {
  var result = true;
  for (var i = 0; i < this._inputs.length; i++) {
    var res = this._inputs[i].simulateOutput(input);
    this.element.find(".circuit-input[data-pos=" + i + "]").addClass(CIRCUIT_CONSTANTS.VALCLASS[res]);
    result = result && res;
  }
  this.element.find(".circuit-output").addClass(CIRCUIT_CONSTANTS.VALCLASS[result]);
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

  this._positionInputHandles(true);
};
CircuitNandComponent.prototype._andSimulateOutput = CircuitAndComponent.prototype.simulateOutput;
CircuitNandComponent.prototype.simulateOutput = function(input) {
  var out = !this._andSimulateOutput(input);
  this.element.find(".circuit-output")
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

  this._positionInputHandles(true);
};
CircuitNotComponent.prototype.simulateOutput = function(input) {
  var inp = this._inputs[0].simulateOutput(input);
  this.element.find(".circuit-input").addClass(CIRCUIT_CONSTANTS.VALCLASS[inp]);
  this.element.find(".circuit-output").addClass(CIRCUIT_CONSTANTS.VALCLASS[!inp]);
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

  this._positionInputHandles(false);
};
CircuitOrComponent.prototype.simulateOutput = function(input) {
  var result = this._inputs[0].simulateOutput(input);
  this.element.find(".circuit-input[data-pos=0]").addClass(CIRCUIT_CONSTANTS.VALCLASS[result]);
  for (var i = 1; i < this._inputCount; i++) {
    var inp = this._inputs[i].simulateOutput(input);
    this.element.find(".circuit-input[data-pos=" + i + "]").addClass(CIRCUIT_CONSTANTS.VALCLASS[inp]);
    result = result || inp;
  }
  this.element.find(".circuit-output").addClass(CIRCUIT_CONSTANTS.VALCLASS[result]);
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

  this._positionInputHandles(false);
};
// output simulation; reuse what the or component would return and negate it
CircuitNorComponent.prototype._orSimulateOutput = CircuitOrComponent.prototype.simulateOutput;
CircuitNorComponent.prototype.simulateOutput = function(input) {
  var result = !this._orSimulateOutput(input);
  this.element.find(".circuit-output")
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

  this._positionInputHandles(false);
};
CircuitXorComponent.prototype.simulateOutput = function(input) {
  var in1 = this._inputs[0].simulateOutput(input);
  this.element.find(".circuit-input[data-pos=0]").addClass(CIRCUIT_CONSTANTS.VALCLASS[in1]);
  var in2 = this._inputs[1].simulateOutput(input);
  this.element.find(".circuit-input[data-pos=1]").addClass(CIRCUIT_CONSTANTS.VALCLASS[in2]);
  var out = ( in1 && !in2 ) || ( !in1 && in2 );
  this.element.find(".circuit-output").addClass(CIRCUIT_CONSTANTS.VALCLASS[out]);
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

  this._positionInputHandles(false);
};
CircuitEqvComponent.prototype._xorSimulateOutput = CircuitXorComponent.prototype.simulateOutput;
CircuitEqvComponent.prototype.simulateOutput = function(input) {
  var result = !this._xorSimulateOutput(input);
  this.element.find(".circuit-output")
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
  this.element.find(".circuit-output").addClass(CIRCUIT_CONSTANTS.VALCLASS[inp]);
  return inp;
};
CircuitInputComponent.prototype.state = function() {
  return $.extend({name: "input", componentName: this._componentName, left: this.element.css("left"),
    top: this.element.css("top")}, this.options);
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
  this._positionInputHandles(false);
};
CircuitOutputComponent.prototype.simulateOutput = function(input) {
  var valid = this.validateInputs();
  if (!valid) { return null; }

  var result = this._inputs[0].simulateOutput(input);
  this.element.find(".circuit-input").addClass(CIRCUIT_CONSTANTS.VALCLASS[result]);
  return result;
};
CircuitOutputComponent.prototype.state = function() {
  return $.extend({name: "output", componentName: this._componentName, left: this.element.css("left"),
    top: this.element.css("top")}, this.options);
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
  var opts = $.extend({output: false, inputCount: 1, componentName: label}, options);
  var comp = new CircuitOutputComponent(this, opts);
  if (!this._outputs) { this._outputs = {}; }
  this._components.push(comp);
  this._outputs[label] = comp;
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
        state.connections.push({to: i, from: this._components.indexOf(c._inputs[j]), pos: j});
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
      this._components[c.to].inputComponent(c.pos, this._components[c.from]);
    }
  }
};