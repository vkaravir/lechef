---
layout: page
title: Documentation
permalink: /documentation/
---


## Getting started

TODO:
 * download
 * libraries required
 * basic HTML structure
 
## Circuit design exercise

The circuit design exercise requires the learner to build a logic circuit matching the assignment description. Typically, this would be the truth table or Boolen expression describing the circuit. While this type of assignment is more difficult to the learner than the simulation exercise, the configuration of this type is quite straightforward. The exercise is initialized with the ```CircuitExercise``` constructor. Here's the initialization of an exercise:

{% highlight javascript %}
var exer = new CircuitExercise({element: $("#design-example"),
                                input: ["x", "y"],
                                output: "g",
                                grading: [{input: {x: true, y: false}, output: true},
                                          {input: {x: false, y: true}, output: false},
                                          {input: {x: true, y: true}, output: false},
                                          {input: {x: false, y: false}, output: false}],
                                components: ["and", "not", "or", "eqv"],
                                addSubmit: false });
{% endhighlight %}

And here's the resulting exercise:

<div class="container design-example lechef-exercise">
  <div class="row">
    <div id="design-example" class="circuit-container"></div>
  </div>
  <div class="row">
    <div class="col-md-6">
      <button class="btn btn-info btn-sm btn-block reset">Reset</button>
    </div>
    <div class="col-md-6">
      <button class="btn btn-info btn-sm btn-block feedback">​Feedback​</button>
    </div>
  </div>
</div>
<script>
  $(function(){
    var exer = new CircuitExercise({element: $("#design-example"), input: ["x", "y"], output: "g",
      grading: [{input: {x: true, y: false}, output: true},
        {input: {x: false, y: true}, output: false},
        {input: {x: true, y: true}, output: false},
        {input: {x: false, y: false}, output: false}], components: ["and", "not", "or", "eqv"], addSubmit: false});
    $(".design-example .reset").click(function(event){
        event.preventDefault();
        exer.reset();
    });
    $(".design-example .feedback").click(function(event){
        event.preventDefault();
        new CircuitExerciseFeedback(exer.options, exer.grade());
    });
  });
</script>

The first thing to note is that lechef doesn't generate any kind of assignment description. That's your job to do when you include an exercise into any HTML page.

Let's go through the options, one by one.

 * ```element``` - The DOM element where the logic circuit and the buttons to create components should be added. 
 * ```input``` - An array of names (so, strings) of the inputs of the circuit.
 * ```output``` - The name of the output of the circuit, again, a string.
 * ```components``` - An array of strings for the components to be available for the student. Defaults to ```["and", "not", "or"]```. The available components are ```and```, ```nand```, ```or```, ```nor```, ```xor```, ```eqv```, and ```not```. 
 * ```addSubmit``` - Whether or not to add a Submit button to the toolbar. Defaults to ```true```.
 * ```grading``` - An array of input - output values that the constructed circuit should match. Essentially, this is
 the truth table of the circuit. Each item in the array should have properties ```input``` and ```output```. The ```input``` property should be an object with properties for each of the input names and values for the values of the inputs. The ```output``` property should be the expected output value with the inputs. The values should all be booleans, so either ```true``` or ```false```.
 * ```lang``` - The language used, as an ISO language code. Defaults to ```en``` for English. The other supported language is Finnish (```fi```). Can you tell I'm Finnish :) 
 
## Circuit Simulation exercise

In the circuit simulation exercise, the learner is given a logic circuit and the input values are fixed and given. The exercise requires the learner to set the values of all the inputs and outputs of the components in the circuit to the correct values. This is done by toggling the values with mouse clicks. 

Depending on the circuit, the exercise can be a bit cumbersome to create, since it requires creating the circuit by coding. A circuit is initialized with the ```LogicCircuit``` constructor. This instance is used to build the circuit (using the API described below). The exercise itself is initialized with the ```CircuitSimulationExercise``` constructor. Here's the initialization of a exercise:

{% highlight javascript %}
var circuit = new LogicCircuit({element: $("#first-example")});
var andComp = circuit.andComponent({left: 250, top: 60});
var in1 = circuit.inputComponent("x", {left: 50, top: 10});
var in2 = circuit.inputComponent("y", {left: 50, top: 110});
var out = circuit.outputComponent("f", {left: 400, top: 65});
andComp.inputComponent(0, in1);
andComp.inputComponent(1, in2);
out.inputComponent(0, andComp);

var simulation = new CircuitSimulationExercise(circuit, {input: {x: true, y: false}});
{% endhighlight %}

And here's the resulting exercise:
<div class="first-example lechef-exercise">
  <div class="container">
    <div class="row">
      <div id="first-example" class="circuit-container"></div>
    </div>
    <div class="row">
      <div class="col-md-6">
        <button class="btn btn-info btn-sm btn-block reset">Reset</button>
      </div>
      <div class="col-md-6">
        <button class="btn btn-info btn-sm btn-block feedback">​Feedback​</button>
      </div>
    </div>
  </div>
</div>
<script>
  $(function() {
    var circuit = new LogicCircuit({element: $("#first-example")});
    var andComp = circuit.andComponent({left: 250, top: 60});
    var in1 = circuit.inputComponent("x", {left: 50, top: 10});
    var in2 = circuit.inputComponent("y", {left: 50, top: 110});
    var out = circuit.outputComponent("f", {left: 400, top: 65});
    andComp.inputComponent(0, in1);
    andComp.inputComponent(1, in2);
    out.inputComponent(0, andComp);

    var simulation = new CircuitSimulationExercise(circuit, {input: {x: true, y: false}});
    $(".first-example .reset").click(function(event){
        event.preventDefault();
        simulation.reset();
    });
    $(".first-example .feedback").click(function(event){
        event.preventDefault();
        new CircuitSimulationFeedback(simulation.options, simulation.grade());
    });
  });
</script>

TODO: the options of the ```CircuitSimulationExercise``` constructor.

 * ```input``` - The values for the input components which the learner should simulate the circuit with. This should be an object with properties matching the labels of the input components and the values booleans.
 * ```lang``` - The language used, as an ISO language code. Defaults to ```en``` for English. The other supported language is Finnish (```fi```).

### The API
At the heart of the API is the ```LogicCircuit``` type. It has functions to add the supported components to the circuit, such as ```.andComponent``` for adding an AND gate. The objects returned by these functions are then connected with their ```.inputComponent``` function. All the functions crucial for specifying the circuit for a circuit simulation exercise are briefly described below.  

#### ```LogicCircuit(options)```
Initializes a new lechef logic circuit. The only options supported :

 * ```element``` - The DOM element where the logic circuit should be added.

#### ```logicCircuit.inputComponent(label)```
#### ```logicCircuit.outputComponent(label)```

These two functions create an input and output component (guess which one is which). They both take the ```label``` used
for the component. This really should be a one-character label in order to properly fit inside the component. 

#### ```logicCircuit.andComponent()```
#### ```logicCircuit.nandComponent()```
#### ```logicCircuit.orComponent()```
#### ```logicCircuit.norComponent()```
#### ```logicCircuit.xorComponent()```
#### ```logicCircuit.eqvComponent()```
#### ```logicCircuit.notComponent()```

The above functions create the components that you can most probably deduce from the name of the component. 

#### ```component.inputComponent(inputNbr, component)```

All the functions to create a component return an instance of the component. All the objects have the ```inputComponent```
function to specify where the input for the component is coming from. The ```inputNbr``` is the position of the input
(zero-based, top-to-bottom) and the ```component``` is another component object, the output of which will be the input
for this component. In the example above, the ```andComp``` gets as its input 0 the input component with label ```x```
and as input 1 the input component with label ```y```. 
