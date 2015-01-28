/* global $ Snap */
(function() {
  "use strict";

  var Utils = {
    extend: function(constructor, superConstructor) {
      function SurrogateConstructor() {}

      SurrogateConstructor.prototype = superConstructor.prototype;

      var prototypeObject = new SurrogateConstructor();
      prototypeObject.constructor = constructor;

      constructor.prototype = prototypeObject;
    }
  };

  window.CIRCUIT_CONSTANTS = {
    VALCLASS: {true: "lechef-value-true",
              false: "lechef-value-false",
              UNKNOWN: "lechef-value-unknown",
              null: "lechef-value-unknown"},
    FEEDBACKCLASS: { true: "lechef-value-correct",
                    false: "lechef-value-incorrect"}
  };

  // Connector in the logic circuit from one component's output to
  // another's input. *DO NOT* modify the inputs and outputs through
  // this object.
  //
  // The path of the connector is an SVG path, drawn with Snap.SVG.
  //
  // The useful functions are to position the path and to set the
  // value (to make it visually different when there's 'current' in
  // the wire.
  var CircuitConnection = function(outOf, outOfPos, into, intoPos, options) {
    this._outOf = outOf;
    this._outOfPos = outOfPos;
    this._into = into;
    this._intoPos = intoPos;
    var path = outOf.circuit._snap.path("M0 0 L 100 100");
    path.addClass("lechef-connector");
    if (typeof options === "object" && options.connectorRemoveAllowed) {
      path.dblclick(this.remove.bind(this));
    }
    this._path = path;
    this.positionPath();
  };
  // Re-calculates the position of this path. In case you want to do some more
  // intelligent drawing, this would be a good function to overwrite :)
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
  // Set the value of this connector. The value should be either true or false.
  CircuitConnection.prototype.setValue = function(value) {
    this._path.addClass(CIRCUIT_CONSTANTS.VALCLASS[value]);
  };
  // Clear the value.
  CircuitConnection.prototype.clearValue = function() {
    this._path.removeClass([CIRCUIT_CONSTANTS.VALCLASS[true], CIRCUIT_CONSTANTS.VALCLASS[false]].join(" "));
  };
  // Remove this connector.
  CircuitConnection.prototype.remove = function() {
    this._into.removeInput(this._intoPos);
  };
  // Destroy this connector. This will remove the SVG path used.
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
  //  - calculateOutput(input): this function should return the output of the
  //                  component. Note, that the input is an array of
  //                  input for this component.
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
                    "'></svg><span class='lechef-label'>" + this._componentName.toUpperCase() +
                                            "</span></div>");
    element.addClass("lechef-component");
    element.addClass("lechef-" + this._componentName);
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
      var output = $("<div />")
                .addClass("lechef-output lechef-missing")
                .attr("data-pos", i);
      this.element.append(output);
      this._outputElements[i] = output;
    }

    this._inputs = [];
    this._inputpaths = [];

    this._inputElements = [];
    this._inputCount = this.options.inputCount;
    for (i = 0; i < this._inputCount; i++ ) {
      var input = $("<div />")
                .addClass("lechef-input lechef-missing")
                .attr("data-pos", i);
      this._inputElements[i] = input;
      this.element.append(input);
      this._inputs.push(null);
    }
    // draw the component shape inside the element
    this.drawComponent();

    // make draggable if option set
    if (this.options.draggable) {
      this._draggable();
    }
  };
  // dummy implementation for the drawComponent
  compproto.drawComponent = function() {
    console.error("Circuit components should implement drawComponent!");
  };
  compproto._outputComponent = function(outpos, comp, path) {
    if (!this._outputs[outpos]) {
      this._outputs[outpos] = [];
      this._outputpaths[outpos] = [];
    }
    this._outputs[outpos].push(comp);
    this._outputpaths[outpos].push(path);
    this._outputElements[outpos].removeClass("lechef-missing");
  };
  compproto.inputComponent = function(inpos, outpos, comp, opts) {
    if (typeof outpos === "object") {
      comp = outpos;
      outpos = 0;
    }
    if (inpos >= this._inputCount || // invalid position, return
        outpos >= comp._outputCount) { return; }
    this.removeInput(inpos);

    this._inputs[inpos] = comp;
    var path = new CircuitConnection(comp, outpos, this, inpos, opts);
    this._inputpaths[inpos] = path;
    this._inputElements[inpos].removeClass("lechef-missing");
    comp._outputComponent(outpos, this, path);
  };
  compproto._removeOutput = function(comp) {
    for (var i = this._outputs.length; i--; ) {
      var ind = this._outputs[i].indexOf(comp);
      if (ind !== -1) {
        this._outputs[i].splice(ind, 1);
        this._outputpaths[i].splice(ind, 1);
        if (this._outputs[i].length === 0) {
          this._outputElements[i].addClass("lechef-missing");
        }
      }
    }
  };
  compproto.removeInput = function(pos) {
    if (this._inputs[pos]) {
      this._inputs[pos]._removeOutput(this);
      this._inputpaths[pos].destroy();
      this._inputs[pos] = null;
      this._inputpaths[pos] = null;
      this._inputElements[pos].addClass("lechef-missing");
    }
  };
  compproto.getOutputComponents = function(pos) {
    if (pos < 0 || pos >= this._outputs.length) {
      return [];
    } else {
      return this._outputs[pos];
    }
  };
  compproto.remove = function() {
    var i, j, k, o, c;
    // remove all inputs to this component
    for (i = this._inputs.length; i--; ) {
      this.removeInput(i);
    }
    // Connections are defined by the component they are input to.
    // So, we go through all outputs of this component and all the
    // components the outputs are connected (2nd loop). Then we go
    // through the inputs of that component and try to find this
    // component (which we are removing). If we find this component,
    // we remove it as input. Simple, right ;)
    for (i = this._outputs.length; i--; ) {
      o = this._outputs[i];
      for (j = o.length; j--; ) {
        c = o[j];
        for (k = c._inputs.length; k--; ) {
          if (this === c._inputs[k]) {
            c.removeInput(k);
            break;
          }
        }
        //this._removeOutput(o[j]);
      }
    }
    this.element.remove();
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
    var h = this.element.outerHeight(),
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
    for (var i = this._inputCount; i--; ) {
      var input = this._inputs[i];
      if (!input) {
        return false;
      }
    }
    return true;
  };
  compproto._setPathValues = function() {
    var val, i, j, paths;
    for (i = this._outputpaths.length; i--; ) {
      val = arguments[i];
      paths = this._outputpaths[i];
      for (j = paths.length; j--; ) {
        paths[j].setValue(val);
      }
    }
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
        this.circuit.element.trigger("lechef-circuit-changed");
      }.bind(this)
    });
  };
  compproto.simulateOutput = function(inputValue, inputComp) {
    if (!this._inputSimulation) {
      this._inputSimulationCompsLeft = $.extend([], this._inputs);
      this._inputSimulation = [];
    }
    var inputPos = this._inputSimulationCompsLeft.indexOf(inputComp);
    if (inputPos === -1) { return; }
    this._inputSimulation[inputPos] = inputValue;
    this._inputSimulationCompsLeft[inputPos] = undefined;

    this._inputElements[inputPos].addClass(CIRCUIT_CONSTANTS.VALCLASS[inputValue]);

    // function for $.map which will filter out undefined values and replace others with true
    // so it can be used to count the number of values which are not undefined
    // - inputs already dealt with will be undefined
    // - inputs not specified (no connector) will be null
    var undefinedFilter = function(item) { 
      return (typeof item  === "undefined")?undefined:true;
    };
    // if we don't have any un-specified inputs, proceed with calculating the output
    if ($.map(this._inputSimulationCompsLeft, undefinedFilter).length === 0) {
      var result = this.calculateOutput(this._inputSimulation);
      this._setPathValues(result);
      for (var i = 0; i < this._outputElements.length; i++) {
        this._outputElements[i].addClass(CIRCUIT_CONSTANTS.VALCLASS[result[i]]);
        if (this._outputs[i]) {
          for (var j = 0; j < this._outputs[i].length; j++) {
            this._outputs[i][j].simulateOutput(result[i], this);
          }
        }
      }
    }
  };

  var CircuitAndComponent = function(circuit, options) {
    this._componentName = "and";
    this.init(circuit, options);
  };
  Utils.extend(CircuitAndComponent, CircuitComponent);
  CircuitAndComponent.prototype.drawComponent = function() {
    var w = this.element.outerWidth(),
        h = this.element.outerHeight();
    this._snap.path("M" + 0.2*w + "," + 0.1*h + // move to x y
                           " L" + 0.5*w + "," + 0.1*h + // line to x y
                           " A" + 0.4*h + "," + 0.4*h + " 0 0 1 " +
                                  0.5*w + "," + 0.9*h +
                           " L" + 0.2*w + "," + 0.9*h + "Z");
    this._snap.line(0.8*w-3, 0.5*h, w, 0.5*h);

    this._positionHandles(true);
  };
  CircuitAndComponent.prototype.calculateOutput = function(inputs) {
    var result = true;
    for (var i = 0; i < inputs.length; i++) {
      result = result && inputs[i];
    }
    return [result];
  };

  var CircuitNandComponent = function(circuit, options) {
    this._componentName = "nand";
    this.init(circuit, options);
  };
  Utils.extend(CircuitNandComponent, CircuitComponent);
  CircuitNandComponent.prototype.drawComponent = function() {
    var w = this.element.outerWidth(),
        h = this.element.outerHeight();
    this._snap.path("M" + 0.2*w + " " + 0.1*h + // move to x y
                          " L" + 0.5*w + " " + 0.1*h + // line to x y
                          " A" + 0.4*h + " " + 0.4*h + " 0 0 1 " +
                          0.5*w + " " + 0.9*h +
                          " L" + 0.2*w + " " + 0.9*h + "Z");
    this._snap.line(0.9*w-2, 0.5*h, w, 0.5*h);
    this._snap.circle(0.8*w + 2, 0.5*h, 4);

    this._positionHandles(true);
  };
  CircuitNandComponent.prototype._andCalculateOutput = CircuitAndComponent.prototype.calculateOutput;
  CircuitNandComponent.prototype.calculateOutput = function(input) {
    var out = !(this._andCalculateOutput(input)[0]);
    return [out];
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

    this._snap.circle(0.7*w + 5, 0.5*h, 4);
    this._snap.polygon([0.2*w, 0.1*h, 0.2*w, 0.9*h, 0.7*w, 0.5*h]);
    this._snap.line(0.7*w + 11, 0.5*h, w, 0.5*h);

    this._positionHandles(true);
  };
  CircuitNotComponent.prototype.calculateOutput = function(inputs) {
    return [!inputs[0]];
  };

  var CircuitOrComponent = function(circuit, options) {
    this._componentName = "or";
    this.init(circuit, options);
  };
  Utils.extend(CircuitOrComponent, CircuitComponent);
  CircuitOrComponent.prototype.drawComponent = function() {
    var w = this.element.outerWidth(),
        h = this.element.outerHeight();
    this._snap.line(0.7*w + 10, 0.5*h, w, 0.5*h);
    this._snap.path("M" + 0.2*w + " " + 0.1*h + // move to x y)
                    " Q" + 0.6*w + " " + 0.15*h + " " + 0.8*w + " " + 0.5*h +
                    " Q" + 0.6*w + " " + 0.85*h + " " + 0.2*w + " " + 0.9*h +
                    " Q" + 0.3*w + " " + 0.5*h + " " + 0.2*w + " " + 0.1*h);

    var i = this._inputCount,
        inputspacing = 0.8*h / (i + 1);
    for (; i--;) {
      // magic number 3; should calculate the intersection of the bezier and the line
      this._snap.line(0, 0.1 * h + inputspacing * (i + 1), 0.2 * w + 3, 0.1 * h + inputspacing * (i + 1));
    }

    this._positionHandles(false);
  };
  CircuitOrComponent.prototype.calculateOutput = function(inputs) {
    var result = inputs[0];
    for (var i = 1; i < inputs.length; i++) {
      result = result || inputs[i];
    }
    return [result];
  };

  var CircuitNorComponent = function(circuit, options) {
    this._componentName = "nor";
    this.init(circuit, options);
  };
  Utils.extend(CircuitNorComponent, CircuitComponent);
  CircuitNorComponent.prototype.drawComponent = function() {
    var w = this.element.outerWidth(),
        h = this.element.outerHeight();
    this._snap.line(0.75*w + 11, 0.5*h, w, 0.5*h);
    this._snap.path("M" + 0.2*w + " " + 0.1*h + // move to x y)
                    " Q" + 0.5*w + " " + 0.15*h + " " + 0.75*w + " " + 0.5*h +
                    " Q" + 0.5*w + " " + 0.85*h + " " + 0.2*w + " " + 0.9*h +
                    " Q" + 0.3*w + " " + 0.5*h + " " + 0.2*w + " " + 0.1*h);
    this._snap.circle(0.75*w + 5, 0.5*h, 4);

    var i = this._inputCount,
      inputspacing = 0.8*h / (i + 1);
    for (; i--;) {
      // magic number 3; should calculate the intersection of the bezier and the line
      this._snap.line(0, 0.1 * h + inputspacing * (i + 1), 0.2 * w + 3, 0.1 * h + inputspacing * (i + 1));
    }

    this._positionHandles(false);
  };
  // output simulation; reuse what the or component would return and negate it
  CircuitNorComponent.prototype._orCalculateOutput = CircuitOrComponent.prototype.calculateOutput;
  CircuitNorComponent.prototype.calculateOutput = function(input) {
    var orResult = this._orCalculateOutput(input);
    return [!orResult[0]];
  };


  var CircuitXorComponent = function(circuit, options) {
    this._componentName = "xor";
    this.init(circuit, options);
  };
  Utils.extend(CircuitXorComponent, CircuitComponent);
  CircuitXorComponent.prototype.drawComponent = function() {
    var w = this.element.outerWidth(),
      h = this.element.outerHeight();
    this._snap.line(0.75*w + 11, 0.5*h, w, 0.5*h);
    this._snap.path("M" + 0.25*w + " " + 0.1*h + // move to x y)
                    " Q" + 0.6*w + " " + 0.15*h + " " + 0.85*w + " " + 0.5*h +
                    " Q" + 0.6*w + " " + 0.85*h + " " + 0.25*w + " " + 0.9*h +
                    " Q" + 0.35*w + " " + 0.5*h + " " + 0.25*w + " " + 0.1*h);
    this._snap.path("M" + 0.2*w + " " + 0.1*h +
                    " Q" + 0.3*w + " " + 0.5*h + " " + 0.2*w + " " + 0.9*h);
    var i = this._inputCount,
      inputspacing = 0.8*h / (i + 1);
    for (; i--;) {
      // magic number 3; should calculate the intersection of the bezier and the line
      this._snap.line(0, 0.1 * h + inputspacing * (i + 1), 0.2 * w + 3, 0.1 * h + inputspacing * (i + 1));
    }

    this._positionHandles(false);
  };
  CircuitXorComponent.prototype.calculateOutput = function(inputs) {
    var in1 = inputs[0],
        in2 = inputs[1];
    return [( in1 && !in2 ) || ( !in1 && in2 )];
  };

  var CircuitEqvComponent = function(circuit, options) {
    this._componentName = "eqv";
    this.init(circuit, options);
  };
  Utils.extend(CircuitEqvComponent, CircuitComponent);
  CircuitEqvComponent.prototype.drawComponent = function() {
    var w = this.element.outerWidth(),
      h = this.element.outerHeight();
    this._snap.line(0.75*w + 11, 0.5*h, w, 0.5*h);
    this._snap.path("M" + 0.25*w + " " + 0.1*h + // move to x y)
                    " Q" + 0.6*w + " " + 0.15*h + " " + 0.75*w + " " + 0.5*h +
                    " Q" + 0.6*w + " " + 0.85*h + " " + 0.25*w + " " + 0.9*h +
                    " Q" + 0.35*w + " " + 0.5*h + " " + 0.25*w + " " + 0.1*h);
    this._snap.path("M" + 0.2*w + " " + 0.1*h +
                    " Q" + 0.3*w + " " + 0.5*h + " " + 0.2*w + " " + 0.9*h);
    this._snap.circle(0.75*w + 6, 0.5*h, 4);
    var i = this._inputCount,
      inputspacing = 0.8*h / (i + 1);
    for (; i--;) {
      // magic number 3; should calculate the intersection of the bezier and the line
      this._snap.line(0, 0.1 * h + inputspacing * (i + 1), 0.2 * w + 3, 0.1 * h + inputspacing * (i + 1));
    }

    this._positionHandles(false);
  };
  CircuitEqvComponent.prototype._xorCalculateOutput = CircuitXorComponent.prototype.calculateOutput;
  CircuitEqvComponent.prototype.calculateOutput = function(input) {
    var xorResult = this._xorCalculateOutput(input);
    return [!xorResult[0]];
  };
  // component for input for the circuit
  var CircuitInputComponent = function(circuit, options) {
    this._componentName = options.componentName || "INPUT";
    options.classNames = (options.classNames || "") + " lechef-input-component";
    this.init(circuit, options);
  };
  Utils.extend(CircuitInputComponent, CircuitComponent);
  CircuitInputComponent.prototype.drawComponent = function() {
    var w = this.element.outerWidth(),
        h = this.element.outerHeight();
    this._snap.line(0.6*w + 2, 0.5*h, w, 0.5*h);
    this._snap.rect(2, 0.2*h, 0.6*w, 0.6*h);
    this._positionHandles(false);
  };
  CircuitInputComponent.prototype.simulateOutput = function(inputVal, comp) {
    this._outputElements[0].addClass(CIRCUIT_CONSTANTS.VALCLASS[inputVal]);
    this._setPathValues(inputVal);

    if (this._outputs[0] && this._outputs[0].length > 0) {
      for (var j=0; j < this._outputs[0].length; j++) {
        this._outputs[0][j].simulateOutput(inputVal, this);
      }
    }

  };
  CircuitInputComponent.prototype.state = function() {
    return $.extend({name: "input", componentName: this._componentName}, this.options,
          { left: this.element.css("left"), top: this.element.css("top")});
  };

  // component for output of the circuit
  var CircuitOutputComponent = function(circuit, options) {
    this._componentName = options.componentName || "OUTPUT";
    options.classNames = (options.classNames || "") + " lechef-output-component";
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
  CircuitOutputComponent.prototype.simulateOutput = function(input, comp) {
    this._inputElements[0].addClass(CIRCUIT_CONSTANTS.VALCLASS[input]);
    if ($.isFunction(this._outputListener)) {
      this._outputListener(this._componentName, input);
    }
  };
  CircuitOutputComponent.prototype.setOutputListener = function(func) {
    this._outputListener = func;
  };
  CircuitOutputComponent.prototype.state = function() {
    return $.extend({name: "output", componentName: this._componentName, left: this.element.css("left"),
      top: this.element.css("top")}, this.options);
  };

  var CircuitHalfAdderComponent = function(circuit, options) {
    var opts = $.extend({outputCount: 2}, options);
    this._componentName = "halfadder";
    this.init(circuit, opts);
    this.element.find(".lechef-label").html("&frac12;");
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
  CircuitHalfAdderComponent.prototype.calculateOutput = function(inputs) {
    var in1 = inputs[0],
        in2 = inputs[1],
        res0 = (in1 || in2) && !(in1 && in2),
        res1 = in1 && in2;
    return [res0, res1];
  };


  var CircuitHalfSubstractorComponent = function(circuit, options) {
    var opts = $.extend({outputCount: 2}, options);
    this._componentName = "halfsubstractor";
    this.init(circuit, opts);
    this.element.find(".lechef-label").html("-&frac12;")
  };
  Utils.extend(CircuitHalfSubstractorComponent, CircuitHalfAdderComponent);
  CircuitHalfSubstractorComponent.prototype.calculateOutput = function(inputs) {
    var in1 = inputs[0],
      in2 = inputs[1],
      res0 = (in1 || in2) && !(in1 && in2),
      res1 = !in1 && in2;
    return [res0, res1];
  };

  var LogicCircuit = function(options) {
    var opts = $.extend({autoresize: true}, options);
    this.element = opts.element || $("<div />");
    if (!opts.element) {
      this.element.appendTo(document.body);
    }
    if (opts.autoresize) {
      this.element.on("lechef-circuit-changed", function() {
        this._resize();
      }.bind(this));
    }
    var svgId = "LC" + new Date().getTime();
    this.element.append("<svg id='" + svgId + "'></svg>");
    this._snap = new Snap("#" + svgId);
    this.element.addClass("lechef-circuit");
    this._components = [];
  };
  LogicCircuit.COMPONENT_TYPES = {
    CircuitAndComponent: CircuitAndComponent,
    CircuitNandComponent: CircuitNandComponent,
    CircuitNotComponent: CircuitNotComponent,
    CircuitOrComponent: CircuitOrComponent,
    CircuitNorComponent: CircuitNorComponent,
    CircuitXorComponent: CircuitXorComponent,
    CircuitEqvComponent: CircuitEqvComponent,
    CircuitInputComponent: CircuitInputComponent,
    CircuitOutputComponent: CircuitOutputComponent,
    CircuitHalfAdderComponent: CircuitHalfAdderComponent,
    CircuitHalfSubstractorComponent: CircuitHalfSubstractorComponent
  };

  var logicproto = LogicCircuit.prototype;
  logicproto._resize = function() {
    var e = this.element,
        mx = e.width(),
        my = e.height();
    e.find(".lechef-component").each(function(index, item) {
      var $item = $(item);
      var pos = $item.position();
      mx = Math.max(mx, pos.left + $item.width() + 20);
      my = Math.max(my, pos.top + $item.height());
    });
    e.css({height: my, width: mx});

  };
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
  logicproto.removeComponent = function(comp) {
    var index = this._components.indexOf(comp);
    if (index !== -1) {
      this._components.splice(index, 1);
      comp.remove();
    }
  };
  logicproto.components = function() {
    return this._components.slice(0);
  };
  logicproto.resetOutput = function() {
    var comps = this._components;
    for (var i = comps.length; i--; ) {
      delete comps[i]._inputSimulation;
      delete comps[i]._inputSimulationCompsLeft;
    }
  };
  logicproto.simulateOutput = function(input, showFeedback, callback) {
    this.resetOutput();
    if (showFeedback) {
      this.element.addClass("lechef-showfeedback");
    }
    var result = {},
        outs = this._outputs,
        outputsMissing = 0,
        called = false;
    var allDone = function allDone() {
      if (!called) {
        called = true;
        if ($.isFunction(callback)) {
          setTimeout(function() {
            callback(result);
          }, 0);
        }
      }
    }.bind(this);
    for (var output in outs) {
      var valid = outs[output].validateInputs();
      if (valid) {
        outs[output].setOutputListener(function (key, val) {
          result[key] = val;
          outputsMissing--;
          if (outputsMissing === 0) {
            setTimeout(allDone, 0);
          }
        });
        outputsMissing++;
      }
    }
    if (outputsMissing > 0) {
      for (var inp in this._inputs) {
        this._inputs[inp].simulateOutput(input[inp], this._inputs[inp]);
      }
      setTimeout(allDone, 0);
    } else {
      setTimeout(allDone, 0);
    }
  };
  logicproto.clearFeedback = function() {
    var fbClasses = [CIRCUIT_CONSTANTS.VALCLASS[false], CIRCUIT_CONSTANTS.VALCLASS[true]];
    this.element.find("." + fbClasses.join(",.")).removeClass(fbClasses.join(' '));
    this.element.removeClass("lechef-showfeedback");
    // the above won't work for the SVG elements, so we'll go through the objects
    for (var i = this._components.length; i--; ) {
      var c = this._components[i];
      for (var j = c._outputpaths.length; j--; ) {
        for (var k = c._outputpaths[j].length; k--; )
        c._outputpaths[j][k].clearValue();
      }
    }
  };
  logicproto.state = function(newState) {
    var state, c, i, j, newC, comps;
    if (typeof newState === "undefined") { // return state
      state = {components: [], connections: []};
      for (i = 0; i < this._components.length; i++) {
        c = this._components[i];
        state.components.push(c.state());
      }
      for (i = 0; i < this._components.length; i++) {
        c = this._components[i];
        for (j = 0; j < c._inputs.length; j++) {
          if (c._inputpaths[j]) {
            state.connections.push({to: i, from: this._components.indexOf(c._inputs[j]),
                                   topos: j, frompos: c._inputpaths[j]._outOfPos});
          }
        }
      }
      return state;
    } else { // set current state
      comps = this.components();
      for (i = comps.length; i--; ) {
        this.removeComponent(comps[i]);
      }
      for (i = 0; i < newState.components.length; i++) {
        c = newState.components[i];
        if (c.name === "input") {
          newC = this.inputComponent(c.componentName, c);
        } else if (c.name === "output") {
          newC = this.outputComponent(c.componentName, c);
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

  window.LogicCircuit = LogicCircuit;


  var TRANSLATIONS = {
    "en": {
      SUBMIT: "Submit",
      CLOSE: "Close",
      YOUR_CIRCUIT: "Your",
      EXPECTED: "Expected",
      INPUT: "Input",
      OUTPUT_COMPARISON: "Output comparison",
      FEEDBACK: "Feedback",
      REMOVE_CONFIRM: "Are you sure you want to remove this component?"
    },
    "fi": {
      SUBMIT: "Lähetä",
      CLOSE: "Sulje",
      YOUR_CIRCUIT: "Sinun",
      EXPECTED: "Odotettu",
      INPUT: "Syöte",
      OUTPUT_COMPARISON: "Ulostulon vertailu",
      FEEDBACK: "Palaute",
      REMOVE_CONFIRM: "Haluatko varmasti poistaa tämän komponentin?"
    }
  };
  LogicCircuit.TRANSLATIONS = TRANSLATIONS;
  LogicCircuit.getLocalizedString = function(lang, strkey) {
    if (!TRANSLATIONS[lang] ||!TRANSLATIONS[lang][strkey]) {
      return strkey;
    }
    return TRANSLATIONS[lang][strkey];
  };

}());