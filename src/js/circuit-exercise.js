/* global $ Snap */
(function() {
  "use strict";

  var CircuitExercise = function (options) {
    this.options = $.extend({components: ["and", "not", "or"],
      template: '<div class="lechef-buttonpanel" />' +
                '<div class="lechef-circuit" />',
      addSubmit: true}, options);
    this.lang = this.options.lang || "en";
    this.element = this.options.element;
    this._init();
  };
  var exerproto = CircuitExercise.prototype;
  exerproto._init = function() {
    this.element.html(this.options.template);
    this.editor = new CircuitEditor($.extend({}, this.options, {element: this.element.find(".lechef-circuit"),
      buttonPanelElement: this.element.find(".lechef-buttonpanel")}));
    if (this.options.addSubmit) {
      this.addSubmitToToolbar();
    }

    this.initInputs();
    this.initOutputs();
  };
  exerproto.addSubmitToToolbar = function () {
    var $buttonPanel = this.options.buttonPanelElement || this.element.find(".lechef-buttonpanel");
    $buttonPanel.prepend('<button class="submit">' + LogicCircuit.getLocalizedString(this.lang, "SUBMIT") + '</button>');
    this.element.find(".submit").click(function () {
      this.grade(function(fb) {
        this.editor.circuit.clearFeedback();
        new CircuitExerciseFeedback(this.options, fb);
      }.bind(this));
    }.bind(this));
  };
  exerproto.initInputs = function () {
    var input = this.options.input,
      w = this.editor.circuit.element.outerWidth(),
      h = this.editor.circuit.element.outerHeight();
    var inputSpacing = 0.8 * h / (input.length + 1);
    for (var i = 0; i < input.length; i++) {
      var inp = this.editor.circuit.inputComponent(input[i]);
      this.editor.setInteractive(inp);
      inp.element.css({top: i*70 + 10,
        left: Math.round(0.1 * w) });
    }
  };
  exerproto.initOutputs = function () {
    var output = this.options.output,
      w = this.editor.circuit.element.outerWidth(),
      h = this.editor.circuit.element.outerHeight();
    var outputSpacing = 0.8 * h / (output.length + 1);
    for (var i = 0; i < output.length; i++) {
      var out = this.editor.circuit.outputComponent(output[i]);
      this.editor.setInteractive(out);
      out.element.css({top: i*70 + 10,
        left: Math.min(600, Math.round(0.9 * w)) });
    }
  };
  exerproto.reset = function() {
    this._init();
  };
  exerproto.grade = function (callback) {
    var checks = $.extend([], this.options.grading),
      feedback = {checks: [], success: true},
      correct;
    var doCheck = function(c) {
      this.editor.circuit.clearFeedback();
      this.editor.circuit.simulateOutput(c.input, false, function(res) {
        if (this.options.output.length === 1) {
          correct = (c.output === res[this.options.output[0]]);
        }
        feedback.success = feedback.success && correct;
        var checkFb = { input: $.extend({}, c.input), output: $.extend({}, res),
          expected: c.output, correct: correct};
        feedback.checks.push(checkFb);
        checks.splice(checks.indexOf(c), 1);
        if (checks.length > 0) {
          doCheck(checks[0]);
        } else {
          this.editor.circuit.clearFeedback();
          feedback.circuit = this.editor.circuit.state();
          callback(feedback);
        }
      }.bind(this));
    }.bind(this);
    if (checks && checks.length > 0) {
      doCheck(checks[0]);
    }
  };

  var CircuitExerciseFeedback = function (exeropts, feedback, options) {
    this.options = $.extend({}, options);
    this.exeropts = exeropts;
    this.feedback = feedback;
    this.lang = this.options.lang || exeropts.lang || "en";
    if (!this.options.element) {
      this.element = $("<div></div>");
      this.element.appendTo(document.body);
    } else {
      this.element = $(this.options.element);
    }
    this.element.addClass("lechef-feedback");
    this.element.html("<div class='lechef-input-output'></div>" +
                    "<div class='lechef-circuit'></div>");
    this.initFeedback();
    this.initCircuit();
  };
  CircuitExerciseFeedback.prototype.initFeedback = function () {
    var outputKey = this.exeropts.output;
    var fbHTML = "<h2>" + LogicCircuit.getLocalizedString(this.lang, "FEEDBACK") +
                 "</h2><button class='lechef-close'>" +
                 LogicCircuit.getLocalizedString(this.lang, "CLOSE") + "</button><table><thead><tr>";
    fbHTML += "<th class='lechef-top' colspan='" + this.exeropts.input.length + "'>" +
                    LogicCircuit.getLocalizedString(this.lang, "INPUT") + "</th><th class='empty'></th>" +
                    "<th colspan='2'>" + LogicCircuit.getLocalizedString(this.lang, "OUTPUT_COMPARISON") +
                    "</th></tr><tr>";
    fbHTML += "<th>" + this.exeropts.input.join('</th><th>');
    fbHTML += "</th><th class='empty'></th><th>" + LogicCircuit.getLocalizedString(this.lang, "YOUR_CIRCUIT") +
                    " " + outputKey + '</th>';
    fbHTML += "<th>" + LogicCircuit.getLocalizedString(this.lang, "EXPECTED") + " " + outputKey +
                    "</th></tr></thead><tbody>";

    for (var i = 0; i < this.feedback.checks.length; i++) {
      var c = this.feedback.checks[i];
      fbHTML += "<tr data-check='" + i + "'";
      fbHTML += " class='" + (c.correct ? "lechef-correct" : "lechef-incorrect") + "'>";
      for (var j = 0; j < this.exeropts.input.length; j++) {
        fbHTML += "<td>" + (c.input[this.exeropts.input[j]]?"1":"0") + "</td>";
      }
      var outVal = c.output[outputKey];
      if (outVal === null) {
        outVal = "";
      } else {
        outVal = (outVal?"1":"0");
      }
      fbHTML += "<td class='empty'></td>";
      fbHTML += "<td class='lechef-output-table'>" + outVal + "</td>";
      fbHTML += "<td class='lechef-output-table'>" + (c.expected?"1":"0") + "</td>";
      fbHTML += "</tr>";
    }
    fbHTML += "</tbody></table>";

    var self = this;
    this.element.find('.lechef-input-output').html(fbHTML)
      .find("tbody tr").click(function() {
        self.circuit.clearFeedback();
        self.circuit.simulateOutput(self.feedback.checks[$(this).data("check")].input, true);
        $(this).parent().find(".lechef-active").removeClass("lechef-active");
        $(this).addClass("lechef-active");
      });
    this.element.find(".lechef-close").click(function() {
      if (self.options.element) {
        self.element.html("");
      } else {
        self.element.remove();
      }
    });
  };
  CircuitExerciseFeedback.prototype.initCircuit = function () {
    this.circuit = new LogicCircuit({element: this.element.find(".lechef-circuit")});
    this.circuit.state(this.feedback.circuit);
  };


  var CircuitSimulationExercise = function (circuit, options) {
    this.circuit = circuit;
    this.circuit.element.addClass("lechef-showfeedback");
    this.options = $.extend({}, options);
    this.initInputs();
    this.initToggles();
  };
  CircuitSimulationExercise.prototype.initInputs = function () {
    var inputValues = this.options.input;
    var inputComponents = this.circuit._inputs;
    for (var key in inputComponents) {
      if (inputComponents.hasOwnProperty(key)) {
        inputComponents[key].element.find(".lechef-output").addClass(CIRCUIT_CONSTANTS.VALCLASS[inputValues[key]]);
      }
    }
  };
  CircuitSimulationExercise.prototype.initToggles = function () {
    var toggles = this.circuit.element.find(".lechef-output, .lechef-input")
      .not(".lechef-value-true, .lechef-value-false")
      .addClass(CIRCUIT_CONSTANTS.VALCLASS.UNKNOWN)
      .addClass("lechef-value-interactive");
    var circuit = this.circuit;
    toggles.click(function (evt) {
      evt.stopPropagation();
      evt.preventDefault();
      var $this = $(this);
      if ($this.hasClass(CIRCUIT_CONSTANTS.VALCLASS.UNKNOWN)) {
        $this.removeClass(CIRCUIT_CONSTANTS.VALCLASS.UNKNOWN)
          .addClass(CIRCUIT_CONSTANTS.VALCLASS[false]);
      } else {
        $this.toggleClass(CIRCUIT_CONSTANTS.VALCLASS[false])
          .toggleClass(CIRCUIT_CONSTANTS.VALCLASS[true]);
      }
      circuit.element.trigger("lechef-circuit-changed");
    });
  };
  CircuitSimulationExercise.prototype.reset = function() {
    this.circuit.element.find(".lechef-value-interactive.lechef-value-true, .lechef-value-interactive.lechef-value-false")
                      .removeClass("lechef-value-true lechef-value-false")
                      .addClass("lechef-value-unknown");
  };

  CircuitSimulationExercise.prototype.grade = function (callback) {
    var outputValue = function (comp) {
        if (comp.element.find(".lechef-output." + CIRCUIT_CONSTANTS.VALCLASS[true]).size() > 0) {
          return true;
        } else if (comp.element.find(".lechef-output." + CIRCUIT_CONSTANTS.VALCLASS[false]).size() > 0) {
          return false;
        } else {
          return null;
        }
      },
      inputValue = function (comp, pos) {
        if (comp.element.find(".lechef-input." + CIRCUIT_CONSTANTS.VALCLASS[true] +
          "[data-pos=" + pos + "]").size() > 0) {
          return true;
        } else if (comp.element.find(".lechef-input." + CIRCUIT_CONSTANTS.VALCLASS[false] +
          "[data-pos=" + pos + "]").size() > 0) {
          return false;
        } else {
          return null;
        }
      };
    var modelcircuit = new LogicCircuit({});
    modelcircuit.state(this.circuit.state());
    modelcircuit.simulateOutput(this.options.input, true, function() {
      var modelComps = modelcircuit._components,
        stdComps = this.circuit._components,
        mc, sc, fb, corr, state, val, success = true,
        feedback = [],
        states = [];
      for (var i = 0, l = stdComps.length; i < l; i++) {
        mc = modelComps[i];
        sc = stdComps[i];
        if (!(sc instanceof LogicCircuit.COMPONENT_TYPES.CircuitInputComponent)) {
          fb = {input: []};
          feedback.push(fb);
          state = {input: []};
          states.push(state);
          if (!(sc instanceof LogicCircuit.COMPONENT_TYPES.CircuitOutputComponent)) {
            val = outputValue(sc);
            corr = (val === outputValue(mc));
            success = success && corr;
            fb.output = corr;
            state.output = val;
          }
          for (var j = 0; j < sc._inputCount; j++) {
            val = inputValue(sc, j);
            corr = (val === inputValue(mc, j));
            success = success && corr;
            fb.input.push(corr);
            state.input.push(val);
          }
        } else {
          feedback.push(null);
          states.push(null);
        }
      }
      modelcircuit.element.remove();
      callback({feedback: feedback, states: states, success: success, circuit: this.circuit.state()});
    }.bind(this));
  };

  var CircuitSimulationFeedback = function (exeropts, feedback, options) {
    this.options = $.extend({}, options);
    this.exeropts = exeropts;
    this.feedback = feedback;
    this.lang = this.options.lang || exeropts.lang || "en";
    if (!this.options.element) {
      this.element = $("<div></div>");
      this.element.appendTo(document.body);
    } else {
      this.element = $(this.options.element);
    }
    this.element.addClass("lechef-feedback");
    this.element.html("<button class='lechef-close'>" + LogicCircuit.getLocalizedString(this.lang, "CLOSE") +
                      "</button><div class='lechef-circuit'></div>");
    this.initCircuit();
    this.initFeedback();

    var self = this;
    this.element.find(".lechef-close").click(function () {
      if (!self.options.element) {
        this.element.remove();
      } else {
        this.element.html("");
      }
    }.bind(this));
  };
  CircuitSimulationFeedback.prototype.initCircuit = CircuitExerciseFeedback.prototype.initCircuit;
  CircuitSimulationFeedback.prototype.initFeedback = function () {
    var comps = this.circuit._components,
      feedback = this.feedback.feedback,
      states = this.feedback.states,
      c, state, fb;
    var outputFeedback = function (comp, compFb, compState) {
      var e = comp.element.find(".lechef-output");
      e.addClass(CIRCUIT_CONSTANTS.VALCLASS[compState.output])
        .addClass(CIRCUIT_CONSTANTS.FEEDBACKCLASS[compFb.output])
        .addClass("lechef-value-interactive");
    };
    var inputFeedback = function (comp, pos, compFb, compState) {
      var e = comp._inputElements[pos];
      e.addClass(CIRCUIT_CONSTANTS.VALCLASS[compState.input[pos]])
        .addClass(CIRCUIT_CONSTANTS.FEEDBACKCLASS[compFb.input[pos]])
        .addClass("lechef-value-interactive");
    };
    for (var i = 0, l = comps.length; i < l; i++) {
      c = comps[i];
      if (!(c instanceof LogicCircuit.COMPONENT_TYPES.CircuitInputComponent)) {
        fb = feedback[i];
        state = states[i];
        if (!(c instanceof LogicCircuit.COMPONENT_TYPES.CircuitOutputComponent)) {
          outputFeedback(c, fb, state);
        }
        for (var j = c._inputCount; j--;) {
          inputFeedback(c, j, fb, state);
        }
      } else { // add the value label to the input
        c.element.find(".lechef-output").addClass(CIRCUIT_CONSTANTS.VALCLASS[this.exeropts.input[c._componentName]]);
      }
    }
  };

  window.CircuitExercise = CircuitExercise;
  window.CircuitExerciseFeedback = CircuitExerciseFeedback;
  window.CircuitSimulationExercise = CircuitSimulationExercise;
  window.CircuitSimulationFeedback = CircuitSimulationFeedback;
}());