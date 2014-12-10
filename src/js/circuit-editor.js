/* global $ Snap */
(function() {
  "use strict";
  var CircuitEditor = function (options) {
    this.options = $.extend({useImages: false}, options);
    this.element = this.options.element;
    this.lang = this.options.lang || "en";
    this.circuit = new LogicCircuit(options);
    this.createToolbar();
    this.initToolbar();
  };
  var editorproto = CircuitEditor.prototype;
  editorproto.createToolbar = function () {
    var comps = this.options.components || ["and", "nand", "not", "or", "nor", "xor", "eqv"],
      html = "";
    for (var i = 0; i < comps.length; i++) {
      var c = comps[i];
      html += '<button class="add' + c + '" title="' + c + '">' +
        (this.options.useImages ? '<img src="images/' + c + '.svg" />' : c.toUpperCase()) +
        '</button>';
    }
    var $buttonPanel = this.options.buttonPanelElement || this.element.find(".lechef-buttonpanel");
    $buttonPanel.html(html);
    this.buttonPanel = $buttonPanel;
  };
  editorproto.initToolbar = function () {
    var $buttonPanel = this.buttonPanel,
        compOptions = {removeAllowed: true};
    $(".addnot", $buttonPanel).click(function () {
      var comp = this.circuit.notComponent(compOptions);
      this.element.trigger("lechef-circuit-changed");
      this.setInteractive(comp);
    }.bind(this));
    $(".addand", $buttonPanel).click(function () {
      var comp = this.circuit.andComponent(compOptions);
      this.element.trigger("lechef-circuit-changed");
      this.setInteractive(comp);
    }.bind(this));
    $(".addnand", $buttonPanel).click(function () {
      var comp = this.circuit.nandComponent(compOptions);
      this.element.trigger("lechef-circuit-changed");
      this.setInteractive(comp);
    }.bind(this));
    $(".addor", $buttonPanel).click(function () {
      var comp = this.circuit.orComponent(compOptions);
      this.element.trigger("lechef-circuit-changed");
      this.setInteractive(comp);
    }.bind(this));
    $(".addnor", $buttonPanel).click(function () {
      var comp = this.circuit.norComponent(compOptions);
      this.element.trigger("lechef-circuit-changed");
      this.setInteractive(comp);
    }.bind(this));
    $(".addxor", $buttonPanel).click(function () {
      var comp = this.circuit.xorComponent(compOptions);
      this.element.trigger("lechef-circuit-changed");
      this.setInteractive(comp);
    }.bind(this));
    $(".addeqv", $buttonPanel).click(function () {
      var comp = this.circuit.eqvComponent(compOptions);
      this.element.trigger("lechef-circuit-changed");
      this.setInteractive(comp);
    }.bind(this));
    $(".addha", $buttonPanel).click(function () {
      var comp = this.circuit.halfAdderComponent(compOptions);
      this.element.trigger("lechef-circuit-changed");
      this.setInteractive(comp);
    }.bind(this));
    $(".addhs", $buttonPanel).click(function () {
      var comp = this.circuit.halfSubstractorComponent(compOptions);
      this.element.trigger("lechef-circuit-changed");
      this.setInteractive(comp);
    }.bind(this));
  };
  editorproto.setInteractive = function (comp) {
    var x, y,
        editor = this;
    if (comp.options.removeAllowed) {
      comp.element.dblclick(function() {
        var remove = confirm(LogicCircuit.getLocalizedString(editor.lang, "REMOVE_CONFIRM"));
        if (remove) {
          editor.circuit.removeComponent(comp);
        }
      });
    }
    comp.element.find('.lechef-output').draggable({
      revert: true,
      helper: "clone",
      start: function (evt, ui) {
        var pos = comp.element.position(),
            helper = ui.helper,
            helperPos = helper.position();
        x = pos.left + helperPos.left + helper.outerWidth();
        y = pos.top + helperPos.top + helper.outerHeight() / 2.0;
        editor.path = editor.circuit._snap.path("M" + x + " " + y + " Q" + x + " " + y + " " + x + " " + y);
        editor.path.addClass("lechef-connector lechef-unconnected");
        editor.circuit.clearFeedback();
      },
      drag: function (evt, ui) {
        var pos = comp.element.position(),
            helper = ui.helper,
            helperPos = helper.position();
        var newX = pos.left + helperPos.left + helper.outerWidth() / 2.0,
          newY = pos.top + helperPos.top + helper.outerHeight() / 2.0;
        editor.path.attr("path", "M" + x + " " + y + // move to the starting point
          " C" + (x + newX) / 2.0 + " " + y + // cubic bezier, first control point
          " " + (x + newX) / 2.0 + " " + newY + // cubic bezier, second control point
          " " + newX + " " + newY); // cubix bezier, end point
      },
      stop: function (evt, ui) {
        if (editor.selected) {
          editor.selected.inputComponent(editor.pos, ui.helper.data("pos"), comp, {connectorRemoveAllowed: true});
        }
        editor.path.remove();
        editor.path = null;
        editor.selected = null;
        editor.element.trigger("lechef-circuit-changed");
      }.bind(this)});
    comp.element.find(".lechef-input").droppable({
      accept: ".lechef-output",
      drop: function (evt, ui) {
        if (editor.path) {
          editor.pos = $(this).data("pos");
          editor.selected = comp;
          editor.element.trigger("lechef-circuit-changed");
        }
      },
      over: function (evt, ui) {
        if (editor.path) {
          editor.path.removeClass("lechef-unconnected");
        }
      },
      out: function (evt, ui) {
        if (editor.path) {
          editor.path.addClass("lechef-unconnected");
        }
      }
    });
  };
  editorproto.state = function (newState) {
    if (typeof newState === "undefined") {
      return this.circuit.state();
    } else {
      this.circuit.state(newState);
      var comps = this.circuit._components;
      for (var i = comps.length; i--;) {
        this.setInteractive(comps[i]);
      }
    }
  };

  window.CircuitEditor = CircuitEditor;
}());