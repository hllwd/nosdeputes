# Nos députés

A WebGL attempt using the [API] of [Regards Citoyens] with [three.js] & [d3.js]
[the application is available here]

![Hemicycle](https://raw2.github.com/hllwd/nosdeputes/master/doc/img/printscreen.png)

## Installation

    npm install

## Launch

    node index.js

and then open the [index page]

## Dependencies

* [d3.js] - for data driven documents
* [three.js] - a webgl library

## Resources

* [commented hello world]

## Todo list (for the record)

* add a selector to change parameter : OK
* display the selected depute : OK
* align boxes with a rotation : OK - use cylinders instead
* outline effect on depute selection : OK
* add mean for each party : OK
* add a transition on criterion change : OK
* display max and min, mean, median, ... for each criterion
* add a search box : OK
* branch API with a server side : OK
    * enhance selected depute's display : picture, ... : OK
    * display more information
* fix "Matrix3.getInverse(): can't invert matrix, determinant is 0"
* fix M key display full screen : OK
* threejs r68 compatibility : OK

[API]: http://cpc.regardscitoyens.org/trac/wiki/API
[Regards Citoyens]: http://www.regardscitoyens.org/
[d3 update]: https://github.com/mrdoob/three.js/wiki/Updates
[d3.js]: http://d3js.org
[three.js]: http://threejs.org
[commented hello world]: https://github.com/stemkoski/stemkoski.github.com/blob/master/Three.js/HelloWorld.html
[index page]: http://localhost:3000
[the application is available here]: http://nosdeputes.herokuapp.com