/**
 * Created by nmondon on 18/07/2014.
 */

!function ($, d3, th, thx, _, win, sortAttribute) {

    // global vars : threejs
    var container, scene, camera, renderer, controls, mouse, projector, gui;
    // global vars : ray intersect
    var targetList = new Array();
    // remove list
    var removeList = new Array();
    // outline
    var outlineMaterial, outlineMesh;
    // global vars : data
    var dataDeputes, deputes, scaleYSortAttribute, parties;
    // hemicycle
    var iCol, iLine, maxCol, maxLine, minRadius, maxRadius, scaleRadius, minAngle, maxAngle, scaleAngle, sizeBox;
    // party mean
    var scaleZParty;
    // animation
    var currentTimeAnimation = 0;
    var maxTimeAnimation = 10;
    // scale for animation
    var scaleAnimation;
    // colors
    var colors = {
        ECOLO: 0x90EE90, GDR: 0xFF0033, NI: 0x999999, RRDP: 0xFF8C00, SRC: 0xFF69B4, UDI: 0xB0E0E6, UMP: 0x4169E1
    };
    // positions for sort
    var positions = {
        ECOLO: 1, GDR: 0, NI: 6, RRDP: 3, SRC: 2, UDI: 4, UMP: 5 };
    // message box
    var $messageBox, $messageBoxName, $messageBoxParty, $messageBoxValue, $messageBoxImg;
    // select box
    var $autocomplete;
    // display current criterion
    var $criterion;
    // stats panel
    var $statsPanel;
    var d3statsSvg;
    var gParties;
    var gMinMax;

    // dom ready callback
    function onDomReady() {
        $messageBox = $('.message-box');
        $messageBoxName = $messageBox.find('#message-box-name');
        $messageBoxParty = $messageBox.find('#message-box-party');
        $messageBoxValue = $messageBox.find('#message-box-value');
        $messageBoxImg = $messageBox.find('img');
        $autocomplete = $('.search-box input');
        $criterion = $('.criterion');
        $statsPanel = $('.stats-panel');
        d3statsSvg = d3.select('.stats-panel').append('svg')
            .attr('class', 'svg-stats-panel');

        gMinMax = d3statsSvg.append('g')
            .attr('class', 'g-minmax');
        gParties = d3statsSvg.append('g')
            .attr('class', 'g-parties')
            .attr('transform', 'translate(0, 150)');

        gMinMax.append('text')
            .attr('class', 'title-label')
            .attr('x', 10)
            .attr('y', 20)
            .text('MIN / MAX : ');

        gParties.append('text')
            .attr('class', 'title-label')
            .attr('x', 10)
            .attr('y', 20)
            .text('MOYENNES PAR PARTIES : ');

    };

    // setup scene
    function setup(rawData) {

        // width
        var w = win.innerWidth;
        // height
        var h = win.innerHeight;
        var viewAngle = 40;
        var aspect = w / h;
        var near = 0.1;
        var far = 20000;
        var axes;
        var skyBoxGeometry;
        var skyBoxMaterial;
        var skyBox;
        var ControlObject = {
            criterion: sortAttribute
        };
        var criterionController;
        // control instance
        var controlInstance = Object.create(ControlObject);
        var controlData = [
            'nb_mandats',
            'semaines_presence',
            'commission_presences',
            'commission_interventions',
            'hemicycle_interventions',
            'hemicycle_interventions_courtes',
            'amendements_signes',
            'amendements_adoptes',
            'rapports',
            'propositions_ecrites',
            'propositions_signees',
            'questions_ecrites',
            'questions_orales'
        ];
        // set outline material
        outlineMaterial = new th.MeshBasicMaterial({ color: 0x00ff00, side: th.BackSide });

        // set up dom ready callback
        $(onDomReady);

        // set hemicycle vars
        setupHemicycle();

        // set data
        dataDeputes = rawData;

        // set up animation
        scaleAnimation = d3.scale.linear()
            .domain([0, maxTimeAnimation])
            .range([0, 1]);

        // scene
        scene = new th.Scene();

        // camera
        camera = new th.PerspectiveCamera(viewAngle, aspect, near, far);
        // add the camera to the scene at the default position (0,0,0)
        scene.add(camera);
        // so pull it back
		camera.position.set(-600, 600, -600);
		// and set the angle towards the scene origin
        camera.lookAt(scene.position);

        // renderer
        if (Detector.webgl) {
            renderer = new th.WebGLRenderer({
                antialias: true
            });
        } else {
            renderer = new th.CanvasRenderer();
        }
        renderer.setSize(w, h);

        // container
        container = document.getElementById('container');
        // attach renderer to the container
        container.appendChild(renderer.domElement);

        // events
        // automatically resize renderer
        thx.WindowResize(renderer, camera);

        // controls
        controls = new th.OrbitControls(camera, renderer.domElement);

        // lights
        setupLight();

        // axes
        axes = new th.AxisHelper(100);
        scene.add(axes);

        // sky
        // ! make sure the camera's far is big enough to render the sky
        skyBoxGeometry = new th.BoxGeometry(10000, 10000, 10000);
        skyBoxMaterial = new th.MeshBasicMaterial({
            color: 0xffffff,
            side: th.BackSide
        });
        skyBox = new th.Mesh(skyBoxGeometry, skyBoxMaterial);
        scene.add(skyBox);

        // projector
        projector = new th.Projector();

        // gui
        gui = new dat.GUI();
        criterionController = gui.add(controlInstance, 'criterion', controlData);
        gui.open();
        criterionController.onFinishChange(function (value) {
            $criterion.html(value);
            // unselect selected depute
            unselectSelectedDepute();
            // set sort attribute
            sortAttribute = value;
            // compute datas
            setupData();
        });

        $criterion.html(sortAttribute);

        win.addEventListener('click', onMouseClick, false);

        setupData();

        // needs to be after data setup
        setupAutocomplete();

        animate();
    };

    function resetAnimation() {
        currentTimeAnimation = 0;
        removeShapes();
        addDeputes();
        addParties();
    };

    function setupAutocomplete() {
        $autocomplete.autocomplete({
            lookup: deputes.map(function (d) {
                return {
                    value: d.nom,
                    data: d
                };
            }),
            onSelect: function (suggestion) {
                selectDepute(suggestion.data);
            }
        });
    };

    // process datas
    function setupData() {
        var tempHashParties;
        // data
        deputes = dataDeputes.deputes.map(function (d) {
            return d.depute;
        });
        // scale for y length
        scaleYSortAttribute = d3.scale.linear()
            .domain([0, d3.max(deputes, function (d) {
                return parseInt(d[sortAttribute]);
            })]);
        // we sort deputes
        deputes.sort(function (a, b) {
            if (a.groupe_sigle !== b.groupe_sigle) {
                return positions[a.groupe_sigle] - positions[b.groupe_sigle];
            }
            return a[sortAttribute] - b[sortAttribute];
        });

        // let's deal with parties - the crappy way
        parties = new Array();
        // first, we group deputes by party
        tempHashParties = _.groupBy(deputes, function (d) {
            return d.groupe_sigle;
        });
        // then, we compute mean for each party
        for (var partyKey in tempHashParties) {
            parties.push({
                party: partyKey,
                value: d3.round(d3.mean(tempHashParties[partyKey], function (p) {
                    return parseInt(p[sortAttribute]);
                }), 2)
            });
        }
        ;

        // compute the scale
        scaleZParty = d3.scale.linear()
            .domain([0, parties.length - 1])
            .rangeRound([-minRadius / 2, minRadius / 2]);
        // reset animation
        resetAnimation();
        // draw svg
        drawStatsPanel();
    };

    function setupHemicycle() {
        // indexes for assembly loop
        iCol = 0;
        iLine = 0;
        // maxs for assembly loop : 58 * 10
        maxCol = 10;
        maxLine = 58;
        // radius
        minRadius = 150;
        maxRadius = 300;
        // scale radius
        scaleRadius = d3.scale.linear()
            .domain([0, maxCol])
            .rangeRound([minRadius, maxRadius]);
        // angle
        minAngle = -Math.PI / 2;
        maxAngle = Math.PI / 2;
        // scale angle
        scaleAngle = d3.scale.linear()
            .domain([0, maxLine])
            .range([minAngle, maxAngle]);
        // size box
        sizeBox = 7;
    };

    // from http://stackoverflow.com/questions/15478093/realistic-lighting-sunlight-with-th-js
    function setupLight() {
        // lights
        var hemiLight = new th.HemisphereLight(0xffffff, 0xffffff, 0.6);
        hemiLight.position.set(0, 500, 0);

        var dirLight = new th.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(-1, 0.75, 1);
        dirLight.position.multiplyScalar(50);
        dirLight.name = 'dirlight';
        // dirLight.shadowCameraVisible = true;

        dirLight.castShadow = true;
        dirLight.shadowMapWidth = dirLight.shadowMapHeight = 1024 * 2;

        var d = 300;

        dirLight.shadowCameraLeft = -d;
        dirLight.shadowCameraRight = d;
        dirLight.shadowCameraTop = d;
        dirLight.shadowCameraBottom = -d;

        dirLight.shadowCameraFar = 3500;
        dirLight.shadowBias = -0.0001;
        dirLight.shadowDarkness = 0.35;

        scene.add(hemiLight);
        scene.add(dirLight);
    };

    function draw() {
        if (currentTimeAnimation <= maxTimeAnimation) {
            var currentTime = scaleAnimation(currentTimeAnimation);
            // update elements
            updateElements(currentTime);
            // increase current time for animation
            currentTimeAnimation += 1;
        }
    };

    function removeShapes() {
        removeList.forEach(function (d) {
            scene.remove(d);
        });
        targetList = new Array();
        removeList = new Array();
    };

    function addDeputes() {
        // loop var
        var currentIndice;
        var currentDepute;
        var currentY;
        var currentLine;
        var currentCol;
        var currentPoint;
        var currentGeometry;
        var currentMaterial;
        var currentShape;

        for (iLine = 0; iLine < maxLine; iLine += 1) {
            for (iCol = 0; iCol < maxCol; iCol += 1) {
                currentIndice = iLine * maxCol + iCol;
                if (currentIndice < deputes.length) {
                    currentDepute = deputes[currentIndice];
                    currentY = scaleYSortAttribute.rangeRound([0, 100])(currentDepute[sortAttribute]);
                    currentCol = scaleRadius(iCol);
                    currentLine = scaleAngle(iLine);
                    currentPoint = [
                        Math.cos(currentLine) * currentCol,
                        Math.sin(currentLine) * currentCol
                    ];
                    // radiusAtTop, radiusAtBottom, height, segmentsAroundRadius, segmentsAlongHeight,
                    currentGeometry = new th.CylinderGeometry(3, 3, currentY, 20, 4);
                    currentMaterial = new th.MeshLambertMaterial({ color: colors[currentDepute.groupe_sigle] });
                    currentShape = new th.Mesh(currentGeometry, currentMaterial);
                    currentShape.position.set(currentPoint[0], currentY / 2, currentPoint[1]);
                    currentShape.scale.setY(0);
                    currentShape.userData.depute = currentDepute;
                    scene.add(currentShape);
                    // for intersection purpose
                    targetList.push(currentShape);
                    // for update
                    removeList.push(currentShape);
                }
            }
        }
    };

    function addParties() {
        var currentY = 0;
        var currentGeometry;
        var currentMaterial;
        var currentShape;
        var currentZ;

        parties.forEach(function (currentParty, ind) {
            currentY = scaleYSortAttribute.rangeRound([0, 100])(currentParty.value);
            currentZ = scaleZParty(ind);
            currentGeometry = new th.CylinderGeometry(6, 6, currentY, 20, 4);
            currentMaterial = new th.MeshLambertMaterial({ color: colors[currentParty.party] });
            currentShape = new th.Mesh(currentGeometry, currentMaterial);
            currentShape.position.set(0, currentY / 2, currentZ);
            currentShape.scale.setY(0);
            scene.add(currentShape);
            // for update
            removeList.push(currentShape);
        });
    };

    function updateElements(t) {
        removeList.forEach(function (shape) {
            shape.scale.setY(t);
        });
    };

    function animate() {
        requestAnimationFrame(animate);
        draw();
        render();
        update();
    };

    function drawStatsPanel(){
        var w = $statsPanel.width();
        var h = $statsPanel.height();
        var dur = 500;
        var getKeyForParties = function(p){
            return p.party;
        };
        var scaleY = d3.scale.linear()
            .domain([0, parties.length])
            .range([50, 250]);
        var sortParties = function(p1, p2){
            return p2.value - p1.value;
        };

        parties.sort(sortParties);

        var rectParties = gParties.selectAll('.rect-party').data(parties, getKeyForParties);
        var getWidthRectParties = function(p,i){
            return scaleYSortAttribute.rangeRound([0, w])(p.value);
        };
        var getYRectParties = function(p,i){
            return scaleY(i);
        };
        rectParties.transition().duration(dur)
            .attr('width', getWidthRectParties)
            .attr('y', getYRectParties);
        rectParties.enter().append('rect')
            .attr('class', 'rect-party')
            .attr('x', 10)
            .attr('width', getWidthRectParties)
            .attr('y', getYRectParties)
            .attr('height', 20)
            .style('fill', function(p,i){
                return colors[p.party].toString(16);
            });


        var labelParties = gParties.selectAll('.label-party').data(parties, getKeyForParties);
        var isRectBigEnough = function(p,i){
            return scaleYSortAttribute.rangeRound([0, w])(p.value) > 85;
        };
        var getFillLabelParties = function(p,i){
            if(isRectBigEnough(p,i)){
                return 'white';
            }else {
                return 'black';
            }
        };
        var getXLabelParties = function(p,i){
            if(isRectBigEnough(p,i)){
                return 20;
            }else {
                return scaleYSortAttribute.rangeRound([0, w])(p.value) + 20;
            }
        };
        var getYLabelParties = function(p,i){
            return scaleY(i) + 20/2;
        };
        var getTextLabelParties = function(p,i){
            return p.party + ' : ' + p.value;
        };
        labelParties.transition().duration(dur)
            .attr('x', getXLabelParties)
            .attr('y', getYLabelParties)
            .text(getTextLabelParties)
            .style('fill', getFillLabelParties);
        labelParties.enter().append('text')
            .attr('class', 'label-party')
            .attr('x', getXLabelParties)
            .attr('y', getYLabelParties)
            .text(getTextLabelParties)
            .style('fill', getFillLabelParties);


        var datasMinMax = [
            _ .min(deputes, function(dep){
                return parseInt(dep[sortAttribute]);
            }),
            _ .max(deputes, function(dep){
                return parseInt(dep[sortAttribute]);
            })
        ];

        var rectMinMax = gMinMax.selectAll('.rect-min-max').data(datasMinMax);
        var getWidthRectMinMax = function(d,i){
            return scaleYSortAttribute.rangeRound([0, w])(parseInt(d[sortAttribute]));
        };
        var getYRectParties = function(d,i){
            return scaleY(i);
        };
        rectMinMax.transition().duration(dur)
            .attr('width', getWidthRectMinMax)
            .attr('y', getYRectParties)
            .style('fill', function(p,i){
                return colors[p.groupe_sigle].toString(16);
            });
        rectMinMax.enter().append('rect')
            .attr('class', 'rect-min-max')
            .attr('x', 10)
            .attr('width', getWidthRectMinMax)
            .attr('y', getYRectParties)
            .attr('height', 20)
            .style('fill', function(p,i){
                return colors[p.groupe_sigle].toString(16);
            });

        var labelMinMax = gMinMax.selectAll('.label-min-max').data(datasMinMax);
        var isRectBigEnoughMinMax = function(p,i){
            return scaleYSortAttribute.rangeRound([0, w])(parseInt(p[sortAttribute])) > 120;
        };
        var getFillLabelMinMax = function(p,i){
            if(isRectBigEnoughMinMax(p,i)){
                return 'white';
            }else {
                return 'black';
            }
        };
        var getXLabelMinMax = function(p,i){
            if(isRectBigEnoughMinMax(p,i)){
                return 20;
            }else {
                return scaleYSortAttribute.rangeRound([0, w])(parseInt(p[sortAttribute])) + 20;
            }
        };
        var getYLabelMinMax = function(p,i){
            return scaleY(i) + 20/2;
        };
        var getTextLabelMinMax = function(p,i){
            return p.nom + ' : ' + parseInt(p[sortAttribute]);
        };
        labelMinMax.transition().duration(dur)
            .attr('x', getXLabelMinMax)
            .attr('y', getYLabelMinMax)
            .text(getTextLabelMinMax)
            .style('fill', getFillLabelMinMax);
        labelMinMax.enter().append('text')
            .attr('class', 'label-min-max')
            .attr('x', getXLabelMinMax)
            .attr('y', getYLabelMinMax)
            .text(getTextLabelMinMax)
            .style('fill', getFillLabelMinMax);
        

    };

    function update() {
        controls.update();
    };

    function render() {
        renderer.render(scene, camera);
    };

    function onMouseClick(event) {
        var vector, ray, intersects;

        // retrive mouse position
        mouse = {
            x: ( event.clientX / window.innerWidth ) * 2 - 1,
            y: -( event.clientY / window.innerHeight ) * 2 + 1
        };

        // create a ray with origin at the mouse position
        // and direction into the scene (camera direction)
        vector = new th.Vector3(mouse.x, mouse.y, 1);
        projector.unprojectVector(vector, camera);
        ray = new th.Raycaster(camera.position, vector.sub(camera.position).normalize());

        // create an array containing all abjects in the scene with wich the ray intersects
        intersects = ray.intersectObjects(targetList);

        // if there is one or more intersections
        if (intersects.length > 0) {
            selectDepute(intersects[0].object.userData.depute, intersects[0].object);
        } else {
            unselectSelectedDepute();
        }

    };

    function selectDepute(depute, object) {
        displaySelectedDepute(depute);
        if (object) {
            outlineSelectedShape(object);
        } else {
            outlineSelectedShape(_.find(targetList, function (obj) {
                return obj.userData.depute.id === depute.id;
            }));
        }
        $autocomplete.val('');
    };

    function displaySelectedDepute(depute) {
        $messageBoxImg.attr('src', 'http://www.nosdeputes.fr/depute/photo/' + depute.slug + '/245');
        $messageBoxName.html(depute.nom);
        $messageBoxParty.html(depute.parti_ratt_financier);
        $messageBoxValue.html(depute[sortAttribute]);
        $messageBox.css({
            'opacity': 1
        });
    };

    function unselectSelectedDepute() {
        $messageBox.css({
            'opacity': 0
        });
        scene.remove(outlineMesh);
    };

    function outlineSelectedShape(object) {
        scene.remove(outlineMesh);
        var increment = 2;
        var outlineGeometry = new th.CylinderGeometry(
            object.geometry.parameters.radiusTop + increment,
            object.geometry.parameters.radiusBottom + increment,
            object.geometry.parameters.height + increment,
            20,
            4);
        outlineMesh = new th.Mesh(outlineGeometry, outlineMaterial);
        outlineMesh.position.set(object.position.x, object.position.y,object.position.z);
        scene.add(outlineMesh);
    };

    // retrieve datas
    d3.json('api/synthese', setup);


}(jQuery, d3, THREE, THREEx, _, window, 'commission_presences');