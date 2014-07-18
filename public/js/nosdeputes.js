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
        ECOLO: 0x90EE90, GDR: 0xFF0033, NI: 0x191970, RRDP: 0xFFFF00, SRC: 0xFF69B4, UDI: 0x8B008B, UMP: 0x4169E1
    };
    // positions for sort
    var positions = {
        ECOLO: 1, GDR: 0, NI: 6, RRDP: 3, SRC: 2, UDI: 4, UMP: 5 };
    // message box
    var $messageBox, $messageBoxName, $messageBoxParty, $messageBoxValue, $messageBoxImg;
    // select box
    var $autocomplete;

    // dom ready callback
    function onDomReady() {
        $messageBox = $('.message-box');
        $messageBoxName = $messageBox.find('#message-box-name');
        $messageBoxParty = $messageBox.find('#message-box-party');
        $messageBoxValue = $messageBox.find('#message-box-value');
        $messageBoxImg = $messageBox.find('img');
        $autocomplete = $('.search-box input');
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
        camera.position.set(-800, 800, -800);
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
        // toggle full screen on given key-press
        thx.FullScreen.bindKey({
            charCode: 'm'.charCodeAt(0)
        });

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
            // unselect selected depute
            unselectSelectedDepute();
            // set sort attribute
            sortAttribute = value;
            // compute datas
            setupData();
        });

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
            onSelect: function(suggestion){
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
            })])
            .rangeRound([0, 100]);
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
                    currentY = scaleYSortAttribute(currentDepute[sortAttribute]);
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
            currentY = scaleYSortAttribute(currentParty.value);
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

    function selectDepute(depute, object){
        displaySelectedDepute(depute);
        if(object){
            outlineSelectedShape(object);
        }else {
            outlineSelectedShape(_.find(targetList, function(obj){
                return obj.userData.depute.id === depute.id;
            }));
        }
        $autocomplete.val('');
    };

    function displaySelectedDepute(depute) {
        $messageBoxImg.attr('src', 'http://www.nosdeputes.fr/depute/photo/' + depute.slug + '/100');
        $messageBoxName.html(depute.nom);
        $messageBoxParty.html(depute.parti_ratt_financier);
        $messageBoxValue.html(depute[sortAttribute]);
        $messageBox.show();
    };

    function unselectSelectedDepute() {
        $messageBox.hide();
        scene.remove(outlineMesh);
    };

    function outlineSelectedShape(object) {
        scene.remove(outlineMesh);
        var increment = 1;
        var outlineGeometry = new th.CylinderGeometry(
            object.geometry.parameters.radiusTop + increment,
            object.geometry.parameters.radiusBottom + increment,
            object.geometry.parameters.height + increment,
            20,
            4);
        outlineMesh = new th.Mesh(outlineGeometry, outlineMaterial);
        outlineMesh.position = object.position;
        scene.add(outlineMesh);
    };

    // retrieve datas
    d3.json('api/synthese', setup);


}(jQuery, d3, THREE, THREEx, _, window, 'commission_presences');