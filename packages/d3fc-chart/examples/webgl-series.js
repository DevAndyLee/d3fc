const colors = ['blue', 'green', 'red', 'cyan', 'purple'];

let numPoints = 200000;
let numPerSeries;

let usingWebGL = true;
let data;

let shapeType = 'Line';
let showBorders = false;

const generateData = () => {
    numPerSeries = Math.floor(numPoints / colors.length);
    data = colors.map((_, colorIndex) => {
        const series = (usingWebGL && shapeType == 'Line') ? new Float32Array(numPerSeries * 2) : [];
        let index = 0;
        for (let n = 0; n < numPerSeries; n++) {
            const item = {
                x: n,
                y: colorIndex * 100 + 10 + Math.random() * 80
            };

            if (usingWebGL) {
                series[index++] = item.x;
                series[index++] = item.y;
            } else {
                series.push(item);
            }
        }
        return series;
    })
};
generateData();

const createSeries = (asWebGL) => {
    const seriesType = asWebGL ? fc[`seriesWebgl${shapeType}`] : fc[`seriesCanvas${shapeType}`];
    const multiType = asWebGL ? fc.seriesWebglMulti : fc.seriesCanvasMulti;

    const allSeries = colors.map(c =>
        seriesType()
            .mainValue(d => d.y)
            .crossValue(d => d.x)
            .decorate(context => {
                const color = d3.color(c);
                if (shapeType == 'Line') {
                    context.strokeStyle = color + '';
                } else {
                    if (showBorders) {
                        context.strokeStyle = color + '';
                        color.opacity = 0.5;
                    } else {
                        context.strokeStyle = 'transparent';
                    }
                    context.fillStyle = color + '';
                }
            })
    );

    return multiType()
        .series(allSeries)
        .mapping((data, index) => {
            return data[index];
        });
};

const xScale = d3.scaleLinear();
const yScale = d3.scaleLinear();
const xCopy = xScale.copy();

const zoom = d3.zoom()
    .on('zoom', function() {
        // use the rescaleX utility function to compute the new scale
        const { transform } = d3.event;
        var rescaledX = transform.rescaleX(xCopy).domain();
        xScale.domain(rescaledX);

        requestRender();
    });

const createChart = (asWebGL) => {
    xScale.domain([0, numPerSeries]);
    yScale.domain([0, colors.length * 100 + 30]);

    xCopy.domain([0, numPerSeries]);

    const chart = fc.chartCartesian(xScale, yScale);

    if (asWebGL) {
        chart.webglPlotArea(createSeries(asWebGL));
    } else {
        chart.canvasPlotArea(createSeries(asWebGL));
    }

    chart.decorate(sel => {
        sel.enter()
            .select('.plot-area')
            .on('measure.range', () => {
                xCopy.range([0, d3.event.detail.width]);
            })
            .call(zoom);
    });

    return chart;
};
let chart = createChart(true);

d3.select('#seriesCanvas').on('click', () => restart(!d3.event.target.checked));
d3.select('#showFPS').on('click', () => {
    if (d3.event.target.checked) {
        start();
    } else {
        stop();
    }
});

let lastTime = 0;
const times = [];
let i = 0;

const showFPS = (t) => {
    const dt = t - lastTime;
    lastTime = t;
    times.push(dt);
    i++;
    if (times.length > 10) times.splice(0, 1);
    if (i > 10) {
        i = 0;
        const avg = times.reduce((s, t) => s + t, 0) / times.length;
        d3.select('#fps').text(`fps: ${Math.floor(1000 / avg)}`);
    }
};

const requestRender = () => {
    if (!running) {
        requestAnimationFrame(render);
    }
};

const render = () => {
    // render
    d3.select('#content')
        .datum(data)
        .call(chart);
};

const animateFrame = (t) => {
    showFPS(t);
    render();

    if (stopRequest) {
        stopRequest();
    } else {
        requestAnimationFrame(animateFrame);
    }
};

const pointSlider = window.slider().max(2000000).value(numPoints).on('change', value => {
    numPoints = value;
    generateData();

    xScale.domain([0, numPerSeries]);
    xCopy.domain([0, numPerSeries]);

    requestRender();
});
d3.select('#slider').call(pointSlider);

let running = false;
let stopRequest = null;
const stop = () => {
    return new Promise(resolve => {
        stopRequest = () => {
            stopRequest = null;
            running = false;
            d3.select('#fps').text('');
            resolve();
        };
    });
};
const start = () => {
    running = true;
    requestAnimationFrame(animateFrame);
};

const restart = asWebGL => {
    const reset = () => {
        usingWebGL = asWebGL;
        generateData();
        d3.select('#content').html('');
        chart = createChart(asWebGL);
    };

    if (running) {
        stop().then(() => {
            reset();
            start();
        });
    } else {
        reset();
        render();
    }
};
render();
