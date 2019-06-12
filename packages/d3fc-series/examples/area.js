var width = 500;
var height = 250;
var container = d3.select('#area-svg');

var dataGenerator = fc.randomGeometricBrownianMotion()
  .steps(50);
var data = dataGenerator(10).map(d => d - 10);

var xScale = d3.scaleLinear()
    .domain([0, data.length])
    .range([0, width]);

var yScale = d3.scaleLinear()
    .domain(fc.extentLinear().include([-1, 2])(data))
    .range([height, 0]);

var svgArea = fc.seriesSvgArea()
    .xScale(xScale)
    .yScale(yScale)
    .defined((_, i) => i % 20 !== 0)
    .crossValue(function(_, i) { return i; })
    .mainValue(function(d) { return d; });

container.append('g')
    .datum(data)
    .call(svgArea);

var canvas = d3.select('#area-canvas').node();
canvas.width = width;
canvas.height = height;
var ctx = canvas.getContext('2d');

var canvasArea = fc.seriesCanvasArea()
    .xScale(xScale)
    .yScale(yScale)
    .defined((_, i) => i % 20 !== 0)
    .context(ctx)
    .crossValue(function(_, i) { return i; })
    .mainValue(function(d) { return d; });
canvasArea(data);

var webgl = d3.select('#area-webgl').node();
webgl.width = width;
webgl.height = height;
var glctx = webgl.getContext('webgl');

var webglArea = fc.seriesWebglArea()
    .xScale(xScale)
    .yScale(yScale)
    .defined((_, i) => i % 20 !== 0)
    .context(glctx)
    .crossValue(function(_, i) { return i; })
    .mainValue(function(d) { return d; });
webglArea(data);
