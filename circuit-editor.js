/**
 * Created by ville on 30/06/14.
 */
var CircuitEditor = function(options) {
  this.circuit = new LogicCircuit(options);
  this.initToolbar();
};
var editorproto = CircuitEditor.prototype;
editorproto.initToolbar = function() {
  $(".addnot").click(function() {
    var comp = this.circuit.notComponent();
    this.setInteractive(comp);
  }.bind(this));
  $(".addand").click(function() {
    var comp = this.circuit.andComponent();
    this.setInteractive(comp);
  }.bind(this));
  $(".addnand").click(function() {
    var comp = this.circuit.nandComponent();
    this.setInteractive(comp);
  }.bind(this));
  $(".addor").click(function() {
    var comp = this.circuit.orComponent();
    this.setInteractive(comp);
  }.bind(this));
  $(".addnor").click(function() {
    var comp = this.circuit.norComponent();
    this.setInteractive(comp);
  }.bind(this));
  $(".addxor").click(function() {
    var comp = this.circuit.xorComponent();
    this.setInteractive(comp);
  }.bind(this));
  $(".addeqv").click(function() {
    var comp = this.circuit.eqvComponent();
    this.setInteractive(comp);
  }.bind(this));
  $(".addha").click(function() {
    var comp = this.circuit.halfAdderComponent();
    this.setInteractive(comp);
  }.bind(this));
};
editorproto.setInteractive = function(comp) {
  var x, y,
      editor = this;
  var elemWidth = comp.element.outerWidth(),
    elemHeight = comp.element.outerHeight(),
    canvasOffset = this.circuit.element.offset();
  comp.element.find('.circuit-output').draggable({
    revert: true,
    helper: "clone",
    start: function(evt, ui) {
      var offset = comp.element.offset();
      x = offset.left - canvasOffset.left + elemWidth;
      y = offset.top - canvasOffset.top + (elemHeight/2.0);
      editor.path = editor.circuit._snap.path("M" + x + " " + y + " Q" + x + " " + y + " " + x + " " + y);
      editor.path.addClass("circuit-connector circuit-unconnected");
      editor.circuit.clearFeedback();
    },
    drag: function(evt, ui) {
      var newX = ui.offset.left - canvasOffset.left + ui.helper.outerWidth()/2.0,
          newY = ui.offset.top - canvasOffset.top + ui.helper.outerHeight()/2.0;
      editor.path.attr("path", "M" + x + " " + y + // move to the starting point
        " C" + (x + newX)/2.0 + " " + y + // cubic bezier, first control point
        " " + (x + newX)/2.0 + " " + newY + // cubic bezier, second control point
        " " + newX + " " + newY); // cubix bezier, end point
    },
    stop: function(evt, ui) {
      if (editor.selected) {
        //console.log("output position:", ui.helper.data("pos"));
        editor.selected.inputComponent(editor.pos, ui.helper.data("pos"), comp);
      }
      editor.path.remove();
      editor.path = null;
      editor.selected = null;
    }.bind(this)});
  comp.element.find(".circuit-input").droppable({
    accept: ".circuit-output",
    drop: function(evt, ui) {
      if (editor.path) {
        editor.pos = $(this).data("pos");
        editor.selected = comp;
      }
    },
    over: function(evt, ui) {
      if (editor.path) {
        editor.path.removeClass("circuit-unconnected");
      }
    },
    out: function(evt, ui) {
      if (editor.path) {
        editor.path.addClass("circuit-unconnected");
      }
    }
  });
};