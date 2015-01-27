var initTestCircuit = function() {
  return new LogicCircuit({element: $(".circuit-test-container")});
};
var setUpSingleComponentCircuit = function(circ, comp) {
  var inpx = circ.inputComponent("x");
  var inpy = circ.inputComponent("y");
  comp.inputComponent(0, inpx);
  comp.inputComponent(1, inpy);
  var out = circ.outputComponent("z");
  out.inputComponent(0, comp);
};

var runTest = function(circ, input, output, msg, assert, done) {
  circ.simulateOutput(input, function(result) {
    assert.deepEqual(result, output, msg + JSON.stringify(input));
    done();
  });
};
var runTests = function(circ, inputs, outputs, msg, assert, done) {
  if (inputs.length > 0) {
    var input = inputs[0],
        output = outputs[0];
    inputs.splice(0, 1);
    outputs.splice(0, 1);
    runTest(circ, input, output, msg, assert, runTests.bind(null, circ, inputs, outputs, msg, assert, done));
  } else {
    done();
  }
};

QUnit.module("circuit.components");
QUnit.test("Xor simulation", function(assert) {
  var circ = initTestCircuit();
  assert.ok(circ);
  var xor = circ.xorComponent();
  setUpSingleComponentCircuit(circ, xor);
  var done = assert.async(),
      testInput = [
                  {x: false, y: false}, {x: true, y: false},
                  {x: false, y: true}, {x: true, y: true}
                  ],
      expectedOutput = [{z: false}, {z: true}, {z: true}, {z: false}];
  runTests(circ, testInput, expectedOutput, "Testing XOR with input ", assert, done);
});
QUnit.test("Eqv simulation", function(assert) {
  var circ = initTestCircuit();
  assert.ok(circ);
  var eqv = circ.eqvComponent();
  setUpSingleComponentCircuit(circ, eqv);
  var done = assert.async(),
    testInput = [
      {x: false, y: false}, {x: true, y: false},
      {x: false, y: true}, {x: true, y: true}
    ],
    expectedOutput = [{z: true}, {z: false}, {z: false}, {z: true}];
  runTests(circ, testInput, expectedOutput, "Testing EQV with input ", assert, done);
});
QUnit.test("Or simulation", function(assert) {
  var circ = initTestCircuit();
  assert.ok(circ);
  var xor = circ.orComponent();
  setUpSingleComponentCircuit(circ, xor);
  var done = assert.async(),
    testInput = [
      {x: false, y: false}, {x: true, y: false},
      {x: false, y: true}, {x: true, y: true}
    ],
    expectedOutput = [{z: false}, {z: true}, {z: true}, {z: true}];
  runTests(circ, testInput, expectedOutput, "Testing OR with input ", assert, done);
});
QUnit.test("Nor simulation", function(assert) {
  var circ = initTestCircuit();
  assert.ok(circ);
  var nor = circ.norComponent();

  setUpSingleComponentCircuit(circ, nor);
  var done = assert.async(),
    testInput = [
      {x: false, y: false}, {x: true, y: false},
      {x: false, y: true}, {x: true, y: true}
    ],
    expectedOutput = [{z: true}, {z: false}, {z: false}, {z: false}];
  runTests(circ, testInput, expectedOutput, "Testing NOR with input ", assert, done);
});
QUnit.test("And simulation", function(assert) {
  var circ = initTestCircuit();
  assert.ok(circ);
  var nor = circ.andComponent();

  setUpSingleComponentCircuit(circ, nor);
  var done = assert.async(),
    testInput = [
      {x: false, y: false}, {x: true, y: false},
      {x: false, y: true}, {x: true, y: true}
    ],
    expectedOutput = [{z: false}, {z: false}, {z: false}, {z: true}];
  runTests(circ, testInput, expectedOutput, "Testing AND with input ", assert, done);
});
QUnit.test("Nand simulation", function(assert) {
  var circ = initTestCircuit();
  assert.ok(circ);
  var nor = circ.nandComponent();

  setUpSingleComponentCircuit(circ, nor);
  var done = assert.async(),
    testInput = [
      {x: false, y: false}, {x: true, y: false},
      {x: false, y: true}, {x: true, y: true}
    ],
    expectedOutput = [{z: true}, {z: true}, {z: true}, {z: false}];
  runTests(circ, testInput, expectedOutput, "Testing NAND with input ", assert, done);
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
  var done = assert.async(),
    testInput = [
      {x: false, y: false}, {x: true, y: false},
      {x: false, y: true}, {x: true, y: true}
    ],
    expectedOutput = [{s: false, c: false}, {s: true, c: false},
                      {s: true, c: false}, {s: false, c: true}];
  runTests(circ, testInput, expectedOutput, "Testing Half-adder with input ", assert, done);
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

  var done = assert.async(),
    testInput = [
      {x: false, y: false}, {x: true, y: false},
      {x: false, y: true}, {x: true, y: true}
    ],
    expectedOutput = [{s: false, c: false}, {s: true, c: false},
                      {s: true, c: true}, {s: false, c: false}];
  runTests(circ, testInput, expectedOutput, "Testing Half-sub with input ", assert, done);
});