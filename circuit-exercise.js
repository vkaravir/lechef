var CircuitExercise = function(options) {
  this.options = $.extend({components: ["and", "not", "or"],
                            template: '<div class="circuit-buttonpanel" />' +
                                      '<div class="circuit" />'}, options);
  this.element = this.options.element;
  this.element.html(this.options.template);
  this.createToolbar();
  this.editor = new CircuitEditor($.extend({}, this.options, {element: this.element.find(".circuit")}));
  this.initInputs();
  this.initOutputs();
};
var exerproto = CircuitExercise.prototype;
exerproto.createToolbar = function() {
  var comps = this.options.components,
      html = '<button class="submit">Submit</button>';
  for (var i = 0; i < comps.length; i++) {
    var c = comps[i];
    html += '<button class="add' + c + '" title="' + c + '"><img src="images/' + c + '.svg" /></button>';
  }
  this.element.find(".circuit-buttonpanel").html(html);
  this.element.find(".submit").click(function() {
    var fb = exer.grade();
    new CircuitExerciseFeedback(exer, fb);
  });

};
exerproto.initInputs = function() {
  var input = this.options.input,
    w = this.editor.circuit.element.outerWidth(),
    h = this.editor.circuit.element.outerHeight();
  var inputSpacing = 0.8*h / (input.length + 1);
  for (var i = 0; i < input.length; i++) {
    var inp = this.editor.circuit.inputComponent(input[i]);
    this.editor.setInteractive(inp);
    inp.element.css({top: Math.round(0.2*h + inputSpacing*i),
      left: Math.round(0.1*w) });
  }
};
exerproto.initOutputs = function() {
  var output = this.options.output,
    w = this.editor.circuit.element.outerWidth(),
    h = this.editor.circuit.element.outerHeight();
  var outputSpacing = 0.8*h / (output.length + 1);
  for (var i = 0; i < output.length; i++) {
    var out = this.editor.circuit.outputComponent(output[i]);
    this.editor.setInteractive(out);
    out.element.css({top: Math.round(0.2*h + outputSpacing*i),
      left: Math.round(0.9*w) });
  }
};
exerproto.grade = function() {
  var checks = this.options.grading,
    feedbackTxt = "",
    feedback = {checks: [], success: true};
  for (var i = 0; i < checks.length; i++) {
    var c = checks[i];
    this.editor.circuit.clearFeedback();
    var res = this.editor.circuit.simulateOutput(c.input);
    if (this.options.output.length === 1) {
      correct = (c.output === res[this.options.output[0]])
    }
    feedbackTxt += "Testing with input: " + JSON.stringify(c.input) + "\n" +
      "Expected output: " + c.output + "\n" +
      "Output of your circuit: " + res[this.options.output[0]] + "\n" +
      (correct?"PASSED":"FAILED") + "\n\n";
    feedback.success = feedback.success && correct;
    var checkFb = { input: $.extend({}, c.input), output: $.extend({}, res),
      expected: c.output, correct: correct};
    feedback.checks.push(checkFb);
  }
  feedback.circuit = this.editor.circuit.state();
  alert(feedbackTxt);
  return feedback;
};

var CircuitExerciseFeedback = function(exer, feedback, options) {
  this.options = $.extend({}, options);
  this.exer = exer;
  this.feedback = feedback;
  if (!this.options.element) {
    this.element = $("<div></div>");
    this.element.appendTo(document.body);
  } else {
    this.element = $(this.options.element);
  }
  this.element.addClass("circuit-feedback");
  this.element.html("<h2>Submission Feedback</h2><div class='circuit-input-output'></div>" +
    "<div class='circuit'></div>");
  this.initFeedback();
  this.initCircuit();

  this.element.find("h2").click(function() {
    this.element.remove();
  }.bind(this));
};
CircuitExerciseFeedback.prototype.initFeedback = function() {
  var outputKey = this.exer.options.output;
  var fbHTML = "<table><thead><tr>";
  fbHTML += "<th>" + this.exer.options.input.join('</th><th>');
  fbHTML += "</th><th>" + outputKey + ' from your circuit</th>';
  fbHTML += "<th class='empty'></th><th>" + outputKey + " expected</th></tr></thead><tbody>";

  for (var i = 0; i < this.feedback.checks.length; i++) {
    var c = this.feedback.checks[i];
    fbHTML += "<tr data-check='" + i + "'";
    fbHTML += " class='" + (c.correct?"circuit-correct":"circuit-incorrect") + "'>";
    for (var j = 0; j < this.exer.options.input.length; j++) {
      fbHTML += "<td>" + c.input[this.exer.options.input[j]] + "</td>";
    }
    var outVal = c.output[outputKey];
    if (outVal === null) { outVal = ""; }
    fbHTML += "<td>" + outVal + "</td>";
    fbHTML += "<td class='empty'></td>";
    fbHTML += "<td>" + JSON.stringify(c.expected) + "</td>";
    fbHTML += "</tr>";
  }
  fbHTML += "</tbody></table>";

  var self = this;
  this.element.find('.circuit-input-output').html(fbHTML)
    .find("tbody tr").click(function() {
      self.circuit.clearFeedback();
      self.circuit.simulateOutput(self.feedback.checks[$(this).data("check")].input);
      $(this).parent().find(".circuit-active").removeClass("circuit-active");
      $(this).addClass("circuit-active");
    });

};
CircuitExerciseFeedback.prototype.initCircuit = function() {
  this.circuit = new LogicCircuit({element: this.element.find(".circuit")});
  this.circuit.state(this.feedback.circuit);
};