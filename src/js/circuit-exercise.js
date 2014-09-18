/* global $ Snap */
(function() {
  "use strict";

  var TRANSLATIONS = {
    "en": {
      SUBMIT: "Submit",
      YOUR_CIRCUIT: "from your circuit",
      EXPECTED: "expected"
    },
    "fi": {
      SUBMIT: "Lähetä",
      YOUR_CIRCUIT: "piiristäsi",
      EXPECTED: "odotettu"
    }
  };
  var getLocalizedString = function(lang, strkey) {
    if (!TRANSLATIONS[lang] ||!TRANSLATIONS[lang][strkey]) {
      return strkey;
    }
    return TRANSLATIONS[lang][strkey];
  };
  var CircuitExercise = function (options) {
    this.options = $.extend({components: ["and", "not", "or"],
      template: '<div class="circuit-buttonpanel" />' +
        '<div class="circuit" />',
      addSubmit: true}, options);
    this.lang = this.options.lang || "en";
    this.element = this.options.element;
    this.element.html(this.options.template);
    this.editor = new CircuitEditor($.extend({}, this.options, {element: this.element.find(".circuit"),
      buttonPanelElement: this.element.find(".circuit-buttonpanel")}));
    if (this.options.addSubmit) {
      this.addSubmitToToolbar();
    }

    this.initInputs();
    this.initOutputs();
  };
  var exerproto = CircuitExercise.prototype;
  exerproto.addSubmitToToolbar = function () {
    var $buttonPanel = this.options.buttonPanelElement || this.element.find(".circuit-buttonpanel");
    $buttonPanel.prepend('<button class="submit">' + getLocalizedString(this.lang, "SUBMIT") + '</button>');
    this.element.find(".submit").click(function () {
      var fb = this.grade();
      new CircuitExerciseFeedback(this.options, fb);
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
  exerproto.grade = function () {
    var checks = this.options.grading,
      feedback = {checks: [], success: true},
      correct;
    for (var i = 0; i < checks.length; i++) {
      var c = checks[i];
      this.editor.circuit.clearFeedback();
      var res = this.editor.circuit.simulateOutput(c.input);
      if (this.options.output.length === 1) {
        correct = (c.output === res[this.options.output[0]]);
      }
      feedback.success = feedback.success && correct;
      var checkFb = { input: $.extend({}, c.input), output: $.extend({}, res),
        expected: c.output, correct: correct};
      feedback.checks.push(checkFb);
    }
    feedback.circuit = this.editor.circuit.state();
    this.editor.circuit.clearFeedback();
    return feedback;
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
    this.element.addClass("circuit-feedback");
    this.element.html("<div class='circuit-input-output'></div>" +
                    "<div class='circuit'></div>");
    this.initFeedback();
    this.initCircuit();
  };
  CircuitExerciseFeedback.prototype.initFeedback = function () {
    var outputKey = this.exeropts.output;
    var fbHTML = "<table><thead><tr>";
    fbHTML += "<th>" + this.exeropts.input.join('</th><th>');
    fbHTML += "</th><th>" + outputKey + " " + getLocalizedString(this.lang, "YOUR_CIRCUIT") + '</th>';
    fbHTML += "<th class='empty'></th><th>" + outputKey + " " +
            getLocalizedString(this.lang, "EXPECTED") + "</th></tr></thead><tbody>";

    for (var i = 0; i < this.feedback.checks.length; i++) {
      var c = this.feedback.checks[i];
      fbHTML += "<tr data-check='" + i + "'";
      fbHTML += " class='" + (c.correct ? "circuit-correct" : "circuit-incorrect") + "'>";
      for (var j = 0; j < this.exeropts.input.length; j++) {
        fbHTML += "<td>" + (c.input[this.exeropts.input[j]]?"1":"0") + "</td>";
      }
      var outVal = c.output[outputKey];
      if (outVal === null) {
        outVal = "";
      } else {
        outVal = (outVal?"1":"0");
      }
      fbHTML += "<td>" + outVal + "</td>";
      fbHTML += "<td class='empty'></td>";
      fbHTML += "<td>" + (JSON.stringify(c.expected)?"1":"0") + "</td>";
      fbHTML += "</tr>";
    }
    fbHTML += "</tbody></table>";

    var self = this;
    this.element.find('.circuit-input-output').html(fbHTML)
      .find("tbody tr").click(function () {
        self.circuit.clearFeedback();
        self.circuit.simulateOutput(self.feedback.checks[$(this).data("check")].input);
        $(this).parent().find(".circuit-active").removeClass("circuit-active");
        $(this).addClass("circuit-active");
      });

  };
  CircuitExerciseFeedback.prototype.initCircuit = function () {
    this.circuit = new LogicCircuit({element: this.element.find(".circuit")});
    this.circuit.state(this.feedback.circuit);
  };


  var CircuitSimulationExercise = function (circuit, options) {
    this.circuit = circuit;
    this.options = $.extend({}, options);
    this.initInputs();
    this.initToggles();
  };
  CircuitSimulationExercise.prototype.initInputs = function () {
    var inputValues = this.options.input;
    var inputComponents = this.circuit._inputs;
    for (var key in inputComponents) {
      if (inputComponents.hasOwnProperty(key)) {
        inputComponents[key].element.find(".circuit-output").addClass(CIRCUIT_CONSTANTS.VALCLASS[inputValues[key]]);
      }
    }
  };
  CircuitSimulationExercise.prototype.initToggles = function () {
    var toggles = this.circuit.element.find(".circuit-output, .circuit-input")
      .not(".circuit-value-true, .circuit-value-false")
      .addClass(CIRCUIT_CONSTANTS.VALCLASS.UNKNOWN)
      .addClass("circuit-value-interactive");
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
      circuit.element.trigger("circuit-changed");
    });
  };
  CircuitSimulationExercise.prototype.grade = function () {
    var outputValue = function (comp) {
        if (comp.element.find(".circuit-output." + CIRCUIT_CONSTANTS.VALCLASS[true]).size() > 0) {
          return true;
        } else if (comp.element.find(".circuit-output." + CIRCUIT_CONSTANTS.VALCLASS[false]).size() > 0) {
          return false;
        } else {
          return null;
        }
      },
      inputValue = function (comp, pos) {
        if (comp.element.find(".circuit-input." + CIRCUIT_CONSTANTS.VALCLASS[true] +
          "[data-pos=" + pos + "]").size() > 0) {
          return true;
        } else if (comp.element.find(".circuit-input." + CIRCUIT_CONSTANTS.VALCLASS[false] +
          "[data-pos=" + pos + "]").size() > 0) {
          return false;
        } else {
          return null;
        }
      };
    var modelcircuit = new LogicCircuit({});
    modelcircuit.state(this.circuit.state());
    modelcircuit.simulateOutput(this.options.input);
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
          corr = val === outputValue(mc);
          success = success && corr;
          fb.output = corr;
          state.output = val;
        }
        for (var j = 0; j < sc._inputCount; j++) {
          val = inputValue(sc, j);
          corr = val === inputValue(mc, j);
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
    return {feedback: feedback, states: states, success: success, circuit: this.circuit.state()};
  };

  var CircuitSimulationFeedback = function (exeropts, feedback, options) {
    this.options = $.extend({}, options);
    this.exeropts = exeropts;
    this.feedback = feedback;
    if (!this.options.element) {
      this.element = $("<div></div>");
      this.element.appendTo(document.body);
    } else {
      this.element = $(this.options.element);
    }
    this.element.addClass("circuit-feedback");
    this.element.html("<div class='circuit'></div>");
    this.initCircuit();
    this.initFeedback();

    this.element.find("h2").click(function () {
      this.element.remove();
    }.bind(this));
  };
  CircuitSimulationFeedback.prototype.initCircuit = CircuitExerciseFeedback.prototype.initCircuit;
  CircuitSimulationFeedback.prototype.initFeedback = function () {
    var comps = this.circuit._components,
      feedback = this.feedback.feedback,
      states = this.feedback.states,
      c, state, fb;
    var outputFeedback = function (comp, compFb, compState) {
      var e = comp.element.find(".circuit-output");
      e.addClass(CIRCUIT_CONSTANTS.VALCLASS[compState.output])
        .addClass(CIRCUIT_CONSTANTS.FEEDBACKCLASS[compFb.output])
        .addClass("circuit-value-interactive");
    };
    var inputFeedback = function (comp, pos, compFb, compState) {
      var e = comp._inputElements[pos];
      e.addClass(CIRCUIT_CONSTANTS.VALCLASS[compState.input[pos]])
        .addClass(CIRCUIT_CONSTANTS.FEEDBACKCLASS[compFb.input[pos]])
        .addClass("circuit-value-interactive");
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
      }
    }
  };

  window.CircuitExercise = CircuitExercise;
  window.CircuitExerciseFeedback = CircuitExerciseFeedback;
  window.CircuitSimulationExercise = CircuitSimulationExercise;
  window.CircuitSimulationFeedback = CircuitSimulationFeedback;
}());