var CIRCUIT_CONSTANTS = {
  VALCLASS: {true: "jsav-circuit-value-true",
            false: "jsav-circuit-value-false"}
};

// The super type for all the circuit components. No instances of
// this type should be directly created. Instead, you should create
// the actual components, like JSAVNotComponent.
//
// Subtypes should make sure they call the init(jsav, circuit, options)
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
var JSAVCircuitComponent = function(jsav, circuit, options) {
  this.init(jsav, circuit, options);
};
// extend JSAVDataStructure
JSAV.utils.extend(JSAVCircuitComponent, JSAV._types.ds.JSAVDataStructure);
var compproto = JSAVCircuitComponent.prototype;
// Initialized a circuit component. JSAV should be an instance of JSAV and circuit
// an instance of JSAVLogicCircuit. The options is an optional object configuring
// the component. Supported options are:
//  - inputCount:
//  - output:
//  - element:
//  - classNames:
compproto.init = function(jsav, circuit, options) {
  this.jsav = jsav;
  this.circuit = circuit;
  this.options = $.extend({inputCount: 2, output: true}, options);
  var element = this.options.element || $("<div><span class='jsavlabel'>" + this._componentName.toUpperCase() +
                                          "</span></div>");
  element.addClass("jsav-circuit-component");
  element.addClass("jsav-circuit-" + this._componentName);
  if (options && options.classNames) { element.addClass(options.classNames); }
  //element.html(CIRCUIT_SHAPES[this._componentName]);
  this.element = element;
  if (!this.options.element) {
    this.circuit.element.append(element);
  }
  console.log(this.options, "left" in this.options);
  if ("left" in this.options) { this.element.css("left", this.options.left); }
  if ("top" in this.options) { this.element.css("top", this.options.top); }

  this._outputs = [];
  this._outputpaths = [];
  if (this.options.output) {
    var output = $("<div />");
    output.addClass("jsav-circuit-output");
    this.element.append(output);
    this._outputElement = output;
  } else {
    this._outputElement = $();
  }

  this._inputElements = [];
  this._inputCount = this.options.inputCount;
  for (var i = 0; i < this._inputCount; i++ ) {
    var input = $("<div />");
    input.addClass("jsav-circuit-input");
    input.attr("data-pos", i);
    this._inputElements[i] = input;
    this.element.append(input);
  }
  this._inputs = [];
  this._inputpaths = [];

  // draw the component shape inside the element
  this.drawComponent();
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
    console.log("remove input");
    this._inputs[pos]._removeOutput(this);
    this._inputpaths[pos].clear();
    this._inputs[pos] = null;
    this._inputpaths[pos] = null;
  }
};
compproto._createPath = function(pos, comp) {
  var path = this.jsav.g.path("M0 0 L 100 100");
  this._positionPath(pos, comp, path);
  path.addClass("jsav-circuit-connector");
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
  if (endX - 20 < startX) {
  } else {
    ctrl1X = (startX + endX) / 2.0;
    ctrl2X = ctrl1X;
  }
  ctrl1X = startX + 80;
  ctrl2X = endX - 80;
  path.path("M" + startX + " " + startY + // move to the starting point
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
compproto._positionInputHandles = function(drawLines, opts) {
  var w = this.element.outerWidth(),
    h = this.element.outerHeight(),
    i = this._inputCount,
    inputspacing = 0.8*h / (i + 1);
  if (drawLines) {
    for (; i--;) {
      this.jsav.g.line(0, 0.1 * h + inputspacing * (i + 1), 0.2 * w, 0.1 * h + inputspacing * (i + 1), opts);
    }
  }
  this.element.find(".jsav-circuit-input").each(function(index, item) {
    $(item).css("top", (0.1*h + inputspacing*(index+1) - $(item).outerHeight()/2.0) + "px");
    console.log("input", index, (0.1*h + inputspacing*(index+1) - $(item).outerHeight()/2.0) + "px");
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
  console.log("validating inputs", this._inputCount, this);
  for (var i = this._inputCount; i--; ) {
    var input = this._inputs[i];
    console.log("validating inputs for input", i, input);
    if (!input) {
      this.element.find(".jsav-circuit-input[data-pos=" + i + "]").addClass("jsav-circuit-missing");
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

var JSAVCircuitAndComponent = function(jsav, circuit, options) {
  this._componentName = "and";
  this.init(jsav, circuit, options);
};
JSAV.utils.extend(JSAVCircuitAndComponent, JSAVCircuitComponent);
JSAVCircuitAndComponent.prototype.drawComponent = function() {
  var w = this.element.outerWidth(),
      h = this.element.outerHeight(),
      opts = {container: this};
  var path = this.jsav.g.path("M" + 0.2*w + " " + 0.1*h + // move to x y
                            " L" + 0.5*w + " " + 0.1*h + // line to x y
                            " A" + 0.4*h + " " + 0.4*h + " 0 0 1 " +
                                    0.5*w + " " + 0.9*h +
                            " L" + 0.2*w + " " + 0.9*h + "Z", opts);
  var output = this.jsav.g.line(0.8*w-5, 0.5*h, w, 0.5*h, opts);

  this._positionInputHandles(true, opts);
};
JSAVCircuitAndComponent.prototype.simulateOutput = function(input) {
  var result = true;
  for (var i = 0; i < this._inputs.length; i++) {
    var res = this._inputs[i].simulateOutput(input);
    this.element.find(".jsav-circuit-input[data-pos=" + i + "]").addClass(CIRCUIT_CONSTANTS.VALCLASS[res]);
    result = result && res;
  }
  this.element.find(".jsav-circuit-output").addClass(CIRCUIT_CONSTANTS.VALCLASS[result]);
  return result;
};

var JSAVCircuitNandComponent = function(jsav, circuit, options) {
  this._componentName = "nand";
  this.init(jsav, circuit, options);
};
JSAV.utils.extend(JSAVCircuitNandComponent, JSAVCircuitComponent);
JSAVCircuitNandComponent.prototype.drawComponent = function() {
  var w = this.element.outerWidth(),
      h = this.element.outerHeight(),
      opts = {container: this};
  var path = this.jsav.g.path("M" + 0.2*w + " " + 0.1*h + // move to x y
    " L" + 0.5*w + " " + 0.1*h + // line to x y
    " A" + 0.4*h + " " + 0.4*h + " 0 0 1 " +
    0.5*w + " " + 0.9*h +
    " L" + 0.2*w + " " + 0.9*h + "Z", opts);
  var output = this.jsav.g.line(0.9*w-5, 0.5*h, w, 0.5*h, opts);
  var circle = this.jsav.g.circle(0.8*w + 3, 0.5*h, 8, opts);

  this._positionInputHandles(true, opts);
};
JSAVCircuitNandComponent.prototype._andSimulateOutput = JSAVCircuitAndComponent.prototype.simulateOutput;
JSAVCircuitNandComponent.prototype.simulateOutput = function(input) {
  var out = !this._andSimulateOutput(input);
  this.element.find(".jsav-circuit-output")
              .removeClass(CIRCUIT_CONSTANTS.VALCLASS[false] + " " + CIRCUIT_CONSTANTS.VALCLASS[true])
              .addClass(CIRCUIT_CONSTANTS.VALCLASS[out]);
  return out;
};

var JSAVCircuitNotComponent = function(jsav, circuit, options) {
  this._componentName = "not";
  var opts = $.extend({inputCount: 1}, options);
  this.init(jsav, circuit, opts);
};
JSAV.utils.extend(JSAVCircuitNotComponent, JSAVCircuitComponent);
JSAVCircuitNotComponent.prototype.drawComponent = function() {
  var w = this.element.outerWidth(),
      h = this.element.outerHeight(),
      opts = {container: this};

  var circle = this.jsav.g.circle(0.7*w + 7, 0.5*h, 8, opts);
  var triangle = this.jsav.g.polygon([[0.2*w, 0.1*h], [0.2*w, 0.9*h], [0.7*w, 0.5*h]], opts);
  var output = this.jsav.g.line(0.7*w + 16, 0.5*h, w, 0.5*h, opts);

  this._positionInputHandles(true, opts);
};
JSAVCircuitNotComponent.prototype.simulateOutput = function(input) {
  var input = this._inputs[0].simulateOutput(input);
  this.element.find(".jsav-circuit-input").addClass(CIRCUIT_CONSTANTS.VALCLASS[input]);
  this.element.find(".jsav-circuit-output").addClass(CIRCUIT_CONSTANTS.VALCLASS[!input]);
  return !input;
};

var JSAVCircuitOrComponent = function(jsav, circuit, options) {
  this._componentName = "or";
  this.init(jsav, circuit, options);
};
JSAV.utils.extend(JSAVCircuitOrComponent, JSAVCircuitComponent);
JSAVCircuitOrComponent.prototype.drawComponent = function() {
  var w = this.element.outerWidth(),
      h = this.element.outerHeight(),
      opts = {container: this};
  var output = this.jsav.g.line(0.7*w + 16, 0.5*h, w, 0.5*h, opts);
  var path = this.jsav.g.path("M" + 0.2*w + " " + 0.1*h + // move to x y)
                              " Q" + 0.6*w + " " + 0.15*h + " " + 0.8*w + " " + 0.5*h +
                              " Q" + 0.6*w + " " + 0.85*h + " " + 0.2*w + " " + 0.9*h +
                              " Q" + 0.3*w + " " + 0.5*h + " " + 0.2*w + " " + 0.1*h, opts);

  var i = this._inputCount,
      inputspacing = 0.8*h / (i + 1);
  for (; i--;) {
    // magic number 5; should calculate the intersection of the bezier and the line
    this.jsav.g.line(0, 0.1 * h + inputspacing * (i + 1), 0.2 * w + 5, 0.1 * h + inputspacing * (i + 1), opts);
  }

  this._positionInputHandles(false, opts);
};
JSAVCircuitOrComponent.prototype.simulateOutput = function(input) {
  var result = this._inputs[0].simulateOutput(input);
  this.element.find(".jsav-circuit-input[data-pos=0]").addClass(CIRCUIT_CONSTANTS.VALCLASS[result]);
  for (var i = 1; i < this._inputCount; i++) {
    var inp = this._inputs[i].simulateOutput(input);
    this.element.find(".jsav-circuit-input[data-pos=" + i + "]").addClass(CIRCUIT_CONSTANTS.VALCLASS[inp]);
    result = result || inp;
  }
  this.element.find(".jsav-circuit-output").addClass(CIRCUIT_CONSTANTS.VALCLASS[result]);
  return result;
};

var JSAVCircuitNorComponent = function(jsav, circuit, options) {
  this._componentName = "nor";
  this.init(jsav, circuit, options);
};
JSAV.utils.extend(JSAVCircuitNorComponent, JSAVCircuitComponent);
JSAVCircuitNorComponent.prototype.drawComponent = function() {
  var w = this.element.outerWidth(),
    h = this.element.outerHeight(),
    opts = {container: this};
  var output = this.jsav.g.line(0.75*w + 16, 0.5*h, w, 0.5*h, opts);
  var path = this.jsav.g.path("M" + 0.2*w + " " + 0.1*h + // move to x y)
    " Q" + 0.5*w + " " + 0.15*h + " " + 0.75*w + " " + 0.5*h +
    " Q" + 0.5*w + " " + 0.85*h + " " + 0.2*w + " " + 0.9*h +
    " Q" + 0.3*w + " " + 0.5*h + " " + 0.2*w + " " + 0.1*h, opts);
  var circle = this.jsav.g.circle(0.75*w + 8, 0.5*h, 8, opts);

  var i = this._inputCount,
    inputspacing = 0.8*h / (i + 1);
  for (; i--;) {
    // magic number 5; should calculate the intersection of the bezier and the line
    this.jsav.g.line(0, 0.1 * h + inputspacing * (i + 1), 0.2 * w + 5, 0.1 * h + inputspacing * (i + 1), opts);
  }

  this._positionInputHandles(false, opts);
};
// output simulation; reuse what the or component would return and negate it
JSAVCircuitNorComponent.prototype._orSimulateOutput = JSAVCircuitOrComponent.prototype.simulateOutput;
JSAVCircuitNorComponent.prototype.simulateOutput = function(input) {
  var result = !this._orSimulateOutput(input);
  this.element.find(".jsav-circuit-output")
              .removeClass(CIRCUIT_CONSTANTS.VALCLASS[false] + " " + CIRCUIT_CONSTANTS.VALCLASS[true])
              .addClass(CIRCUIT_CONSTANTS.VALCLASS[result]);
  return result;
};

// component for input for the circuit
var JSAVCircuitInputComponent = function(jsav, circuit, options) {
  this._componentName = options.componentName || "INPUT";
  options.classNames = (options.classNames || "") + " jsav-circuit-input-component";
  this.init(jsav, circuit, options);
};
JSAV.utils.extend(JSAVCircuitInputComponent, JSAVCircuitComponent);
JSAVCircuitInputComponent.prototype.drawComponent = function() {
  var w = this.element.outerWidth(),
      h = this.element.outerHeight(),
      opts = {container: this};
  jsav.g.line(0.6*w, 0.5*h, 1*w, 0.5*h, opts);
  jsav.g.rect(2, 0.2*h, 0.6*w, 0.6*h, opts);
};
JSAVCircuitInputComponent.prototype.simulateOutput = function(input) {
  var inp = input[this._componentName];
  this.element.find(".jsav-circuit-output").addClass(CIRCUIT_CONSTANTS.VALCLASS[inp]);
  return inp;
};
JSAVCircuitInputComponent.prototype.state = function(newState) {
  return $.extend({name: "input", componentName: this._componentName, left: this.element.css("left"),
    top: this.element.css("top")}, this.options);
};

// component for output of the circuit
var JSAVCircuitOutputComponent = function(jsav, circuit, options) {
  this._componentName = options.componentName || "OUTPUT";
  options.classNames = (options.classNames || "") + " jsav-circuit-output-component";
  this.init(jsav, circuit, options);
};
JSAV.utils.extend(JSAVCircuitOutputComponent, JSAVCircuitComponent);
JSAVCircuitOutputComponent.prototype.drawComponent = function() {
  var w = this.element.outerWidth(),
      h = this.element.outerHeight(),
      opts = {container: this};
  jsav.g.line(0, 0.5*h, 0.4*w - 5, 0.5*h, opts);
  jsav.g.rect(0.4*w - 5, 0.2*h, 0.6*w, 0.6*h, opts);
  this._positionInputHandles(false, opts);
};
JSAVCircuitOutputComponent.prototype.simulateOutput = function(input) {
  var valid = this.validateInputs();
  if (!valid) { return null; }

  var result = this._inputs[0].simulateOutput(input);
  console.log(this.element.find(".jsav-circuit-input").size());
  this.element.find(".jsav-circuit-input").addClass(CIRCUIT_CONSTANTS.VALCLASS[result]);
  return result;
};
JSAVCircuitOutputComponent.prototype.state = function(newState) {
  console.log(this.options);
  return $.extend({name: "output", componentName: this._componentName, left: this.element.css("left"),
    top: this.element.css("top")}, this.options);
};


var JSAVLogicCircuit = function(jsav, options) {
  this.jsav = jsav;
  this.element = options.element ||$("<div />");
  if (!options.element) {
    jsav.canvas.append(this.element);
  }
  this.element.addClass("jsav-circuit");
  this._components = [];
};
JSAV.utils.extend(JSAVLogicCircuit, JSAV._types.JSAVObject);
var logicproto = JSAVLogicCircuit.prototype;
logicproto.andComponent = function(options) {
  var comp = new JSAVCircuitAndComponent(this.jsav, this, options);
  this._components.push(comp);
  return comp;
};
logicproto.nandComponent = function(options) {
  var comp = new JSAVCircuitNandComponent(this.jsav, this, options);
  this._components.push(comp);
  return comp;
};
logicproto.notComponent = function(options) {
  var comp = new JSAVCircuitNotComponent(this.jsav, this, options);
  this._components.push(comp);
  return comp;
};
logicproto.orComponent = function(options) {
  var comp = new JSAVCircuitOrComponent(this.jsav, this, options);
  this._components.push(comp);
  return comp;
};
logicproto.norComponent = function(options) {
  var comp = new JSAVCircuitNorComponent(this.jsav, this, options);
  this._components.push(comp);
  return comp;
};
logicproto.inputComponent = function(label, options) {
  var opts = $.extend({inputCount: 0, componentName: label}, options);
  var comp = new JSAVCircuitInputComponent(this.jsav, this, opts);
  if (!this._inputs) {
    this._inputs = {};
  }
  this._components.push(comp);
  this._inputs[label] = comp;
  return comp;
};
logicproto.outputComponent = function(label, options) {
  var opts = $.extend({output: false, inputCount: 1, componentName: label}, options);
  var comp = new JSAVCircuitOutputComponent(this.jsav, this, opts);
  if (!this._outputs) { this._outputs = {}; }
  this._components.push(comp);
  this._outputs[label] = comp;
  return comp;
};
logicproto.simulateOutput = function(input) {
  var result = {};
  for (var output in this._outputs) {
    result[output] = this._outputs[output].simulateOutput(input);
  }
  return result;
};
logicproto.clearFeedback = function() {
  var fbClasses = ["jsav-circuit-missing", CIRCUIT_CONSTANTS.VALCLASS[false], CIRCUIT_CONSTANTS.VALCLASS[true]];
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
      console.log("connecting", this._components[c.from]._componentName, this._components[c.to]._componentName, c.pos);
      this._components[c.to].inputComponent(c.pos, this._components[c.from]);
    }
  }
};

JSAV.ext.logicCircuit = function(options) {
  return new JSAVLogicCircuit(this, options);
};