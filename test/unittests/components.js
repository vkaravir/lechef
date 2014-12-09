var initTestCircuit = function() {
  var circuit = new LogicCircuit({element: $(".circuit-test-container")});
  return circuit;
};
var setUpSingleComponentCircuit = function(circ, comp) {
  var inpx = circ.inputComponent("x");
  var inpy = circ.inputComponent("y");
  comp.inputComponent(0, inpx);
  comp.inputComponent(1, inpy);
  var out = circ.outputComponent("z");
  out.inputComponent(0, comp);
};

QUnit.module("circuit.components");
QUnit.test("Xor simulation", function(assert) {
  var circ = initTestCircuit();
  assert.ok(circ);
  var xor = circ.xorComponent();
  setUpSingleComponentCircuit(circ, xor);
  assert.ok(!circ.simulateOutput({x: false, y: false}).z, "Testing XOR with input false, false");
  assert.ok(circ.simulateOutput({x: true, y: false}).z, "Testing XOR with input true, false");
  assert.ok(circ.simulateOutput({x: false, y: true}).z, "Testing XOR with input false, true");
  assert.ok(!circ.simulateOutput({x: true, y: true}).z, "Testing XOR with input true, true");
});
QUnit.test("Eqv simulation", function(assert) {
  var circ = initTestCircuit();
  assert.ok(circ);
  var eqv = circ.eqvComponent();
  setUpSingleComponentCircuit(circ, eqv);
  assert.ok(circ.simulateOutput({x: false, y: false}).z, "Testing EQV with input false, false");
  assert.ok(!circ.simulateOutput({x: true, y: false}).z, "Testing EQV with input true, false");
  assert.ok(!circ.simulateOutput({x: false, y: true}).z, "Testing EQV with input false, true");
  assert.ok(circ.simulateOutput({x: true, y: true}).z, "Testing EQV with input true, true");
});
QUnit.test("Or simulation", function(assert) {
  var circ = initTestCircuit();
  assert.ok(circ);
  var xor = circ.orComponent();
  setUpSingleComponentCircuit(circ, xor);
  assert.ok(!circ.simulateOutput({x: false, y: false}).z, "Testing OR with input false, false");
  assert.ok(circ.simulateOutput({x: true, y: false}).z, "Testing OR with input true, false");
  assert.ok(circ.simulateOutput({x: false, y: true}).z, "Testing OR with input false, true");
  assert.ok(circ.simulateOutput({x: true, y: true}).z, "Testing OR with input true, true");
});
QUnit.test("Nor simulation", function(assert) {
  var circ = initTestCircuit();
  assert.ok(circ);
  var nor = circ.norComponent();

  setUpSingleComponentCircuit(circ, nor);
  assert.ok(circ.simulateOutput({x: false, y: false}).z, "Testing NOR with input false, false");
  assert.ok(!circ.simulateOutput({x: true, y: false}).z, "Testing NOR with input true, false");
  assert.ok(!circ.simulateOutput({x: false, y: true}).z, "Testing NOR with input false, true");
  assert.ok(!circ.simulateOutput({x: true, y: true}).z, "Testing NOR with input true, true");
});
QUnit.test("And simulation", function(assert) {
  var circ = initTestCircuit();
  assert.ok(circ);
  var nor = circ.andComponent();

  setUpSingleComponentCircuit(circ, nor);
  assert.ok(!circ.simulateOutput({x: false, y: false}).z, "Testing AND with input false, false");
  assert.ok(!circ.simulateOutput({x: true, y: false}).z, "Testing AND with input true, false");
  assert.ok(!circ.simulateOutput({x: false, y: true}).z, "Testing AND with input false, true");
  assert.ok(circ.simulateOutput({x: true, y: true}).z, "Testing AND with input true, true");
});
QUnit.test("Nand simulation", function(assert) {
  var circ = initTestCircuit();
  assert.ok(circ);
  var nor = circ.nandComponent();

  setUpSingleComponentCircuit(circ, nor);
  assert.ok(circ.simulateOutput({x: false, y: false}).z, "Testing NAND with input false, false");
  assert.ok(circ.simulateOutput({x: true, y: false}).z, "Testing NAND with input true, false");
  assert.ok(circ.simulateOutput({x: false, y: true}).z, "Testing NAND with input false, true");
  assert.ok(!circ.simulateOutput({x: true, y: true}).z, "Testing NAND with input true, true");
});
QUnit.test("Half-adder simulation", function(assert) {
  var circ = initTestCircuit();
  assert.ok(circ);
  var adder = circ.halfAdderComponent();
  var inpx = circ.inputComponent("x");
  var inpy = circ.inputComponent("y");
  adder.inputComponent(0, inpx);
  adder.inputComponent(1, inpy);
  var outS = circ.outputComponent("s");
  var outC = circ.outputComponent("c");
  outS.inputComponent(0, 0, adder);
  outC.inputComponent(0, 1, adder);

  assert.deepEqual(adder.simulateOutput({x: false, y: false}), [false, false], "Testing Half-adder with input false, false");
  assert.deepEqual(adder.simulateOutput({x: true, y: false}), [true, false], "Testing Half-adder with input true, false");
  assert.deepEqual(adder.simulateOutput({x: false, y: true}), [true, false], "Testing Half-adder with input false, true");
  assert.deepEqual(adder.simulateOutput({x: true, y: true}), [false, true], "Testing Half-adder with input true, true");
});
QUnit.test("Half-substractor simulation", function(assert) {
  var circ = initTestCircuit();
  assert.ok(circ);
  var substractor = circ.halfSubstractorComponent();
  var inpx = circ.inputComponent("x");
  var inpy = circ.inputComponent("y");
  substractor.inputComponent(0, inpx);
  substractor.inputComponent(1, inpy);
  var outS = circ.outputComponent("s");
  var outC = circ.outputComponent("c");
  outS.inputComponent(0, 0, substractor);
  outC.inputComponent(0, 1, substractor);

  assert.deepEqual(substractor.simulateOutput({x: false, y: false}), [false, false], "Testing Half-sub with input false, false");
  assert.deepEqual(substractor.simulateOutput({x: true, y: false}), [true, false], "Testing Half-sub with input true, false");
  assert.deepEqual(substractor.simulateOutput({x: false, y: true}), [true, true], "Testing Half-sub with input false, true");
  assert.deepEqual(substractor.simulateOutput({x: true, y: true}), [false, false], "Testing Half-sub with input true, true");
});