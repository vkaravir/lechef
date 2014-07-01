/**
 * Created by ville on 30/06/14.
 */
var JSAVCircuitEditor = function(jsav) {
  this.jsav = jsav;
  this.circuit = jsav.logicCircuit({width: $(".jsavcanvas").width() + "px", height: $(".jsavcanvas").height() + "px"});
  this.initToolbar();
};
var editorproto = JSAVCircuitEditor.prototype;
editorproto.initToolbar = function() {
  $(".addNot").click(function() {
    var comp = this.circuit.notComponent();
    this.setInteractive(comp);
  }.bind(this));
  $(".addAnd").click(function() {
    var comp = this.circuit.andComponent();
    this.setInteractive(comp);
  }.bind(this));
  $(".addNand").click(function() {
    var comp = this.circuit.nandComponent();
    this.setInteractive(comp);
  }.bind(this));
  $(".addOr").click(function() {
    var comp = this.circuit.orComponent();
    this.setInteractive(comp);
  }.bind(this));
  $(".addNor").click(function() {
    var comp = this.circuit.norComponent();
    this.setInteractive(comp);
  }.bind(this));
};
editorproto.setInteractive = function(comp) {
  var x, y,
    self = this;
  comp.element.draggable({
    start: function() {
      self.circuit.clearFeedback();
    },
    drag: function() {
      comp.layout();
    }
  });
  var elemWidth = comp.element.outerWidth(),
    elemHeight = comp.element.outerHeight(),
    canvasOffset = $(".jsavcontainer").offset();;
  console.log(comp, comp._outputElement);
  comp._outputElement.draggable({
    revert: true,
    helper: "clone",
    start: function(evt, ui) {
      var offset = comp.element.offset();
      x = offset.left - canvasOffset.left + elemWidth;
      y = offset.top - canvasOffset.top + (elemHeight/2.0);
      self.path = jsav.g.path("M" + x + " " + y + " Q" + x + " " + y + " " + x + " " + y);
      self.path.addClass("jsav-circuit-connector jsav-circuit-unconnected");
      self.circuit.clearFeedback();
    },
    drag: function(evt, ui) {
      var newX = ui.offset.left - canvasOffset.left + ui.helper.outerWidth()/2.0,
        newY = ui.offset.top - canvasOffset.top + ui.helper.outerHeight()/2.0;
      self.path.path("M" + x + " " + y + // move to the starting point
        " C" + (x + newX)/2.0 + " " + y + // cubic bezier, first control point
        " " + (x + newX)/2.0 + " " + newY + // cubic bezier, second control point
        " " + newX + " " + newY); // cubix bezier, end point
    },
    stop: function(evt, ui) {
      console.log("stopped dragging", self.selected);
      if (!self.selected) {
        self.path.element.remove();
      } else {
        // connect the components in real life
        self.selected.inputComponent(self.pos, comp);
        //comp.outputComponent(selected, path);
        self.path.clear();
      }
      self.path = null;
      self.selected = null;
    }.bind(this)});
  comp.element.find(".jsav-circuit-input").on({
    mouseover: function() {
      $(this).addClass("over");
      console.log($(this).hasClass("over"), self.path);
      if (self.path) {
        self.selected = comp;
        self.pos = $(this).data("pos");
        self.path.removeClass("jsav-circuit-unconnected");
      }
    },
    mouseout: function() {
      $(this).removeClass("over");
      if (self.path) {
        self.selected = null;
        self.path.addClass("jsav-circuit-unconnected");
      }
    }
  });
};