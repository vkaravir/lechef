/**
 * Created by ville on 21/11/14.
 */
QUnit.module("circuit");
QUnit.test("Remove component", function(assert) {
  var circ = initTestCircuit();
  assert.ok(circ);
  var xor = circ.xorComponent();
  var xor2 = circ.xorComponent();
  setUpSingleComponentCircuit(circ, xor);
  assert.equal(circ.components().length, 5);
  assert.equal(xor.getOutputComponents(0).length, 1);
  circ.removeComponent(xor);
  assert.equal(circ.components().length, 4);
  assert.equal(xor.getOutputComponents(0).length, 0);

  // test some internals, to make sure connectors have been removed
  assert.equal(xor._outputpaths.length, 1);
  assert.equal(xor._outputpaths[0].length, 0);
  // test input paths
  assert.equal(xor._inputpaths.length, 2);
  assert.equal(xor._inputpaths[0], null);
  assert.equal(xor._inputpaths[1], null);

  circ.removeComponent(xor2);
  assert.equal(circ.components().length, 3);
});