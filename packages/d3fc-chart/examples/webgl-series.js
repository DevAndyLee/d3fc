const colors = ['blue', 'green', 'red', 'cyan', 'purple'];

let numPoints = 200000;
let numPerSeries;

let usingWebGL = true;
let data;

let shapeType = 'Line';
let showBorders = false;

const xScale = d3.scaleTime();
const yScale = d3.scaleLinear();
const xCopy = xScale.copy();
const startDate = new Date('2000-01-01T12:00:00Z');

let stackData = false;

const generateData = (sameSize = false) => {
    numPerSeries = Math.floor(numPoints / colors.length);
    let lastSeries = null;
    data = colors.map((_, colorIndex) => {
        const series = [];
        let date = new Date(startDate);
        for (let n = 0; n < numPerSeries; n++) {
            const lastSeriesY = lastSeries ? lastSeries[n].y : 0;
            const b = stackData ? lastSeriesY : (colorIndex * 100 + 50);
            series.push({
                x: date,
                y: colorIndex * 100 + 10 + Math.random() * 80,
                b
            });

            const newDate = new Date(date);
            newDate.setHours(newDate.getHours() + 1);
            date = newDate;
        }
        if (!sameSize) xScale.domain([startDate, date]);
        lastSeries = series;
        return series;
    });
    if (!sameSize) xCopy.domain(xScale.domain());
};
generateData();

const createSeries = (asWebGL) => {
    const seriesType = asWebGL ? fc[`seriesWebgl${shapeType}`] : fc[`seriesCanvas${shapeType}`];
    const multiType = asWebGL ? fc.seriesWebglMulti : fc.seriesCanvasMulti;

    const allSeries = colors.map(c => {
        const series = seriesType()
            .mainValue(d => d.y)
            .crossValue(d => d.x)
            .decorate(context => {
                const color = d3.color(c);
                if (shapeType === 'Line') {
                    context.strokeStyle = color + '';
                } else {
                    if (showBorders) {
                        context.strokeStyle = color + '';
                        color.opacity = 0.5;
                    }
                    context.fillStyle = color + '';
                }
            });
        if (shapeType !== 'Line') {
            series.baseValue(d => d.b);
        }
        if (series.cacheEnabled) series.cacheEnabled(true);
        return series;
    });

    return multiType()
        .series(allSeries)
        .mapping((data, index) => {
            return data[index];
        });
};

const zoom = d3.zoom()
    .on('zoom', function() {
        // use the rescaleX utility function to compute the new scale
        const { transform } = d3.event;
        var rescaledX = transform.rescaleX(xCopy).domain();
        xScale.domain(rescaledX);

        requestRender();
    });

const createChart = (asWebGL) => {
    yScale.domain([0, colors.length * 100 + 30]);

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

d3.select('#seriesCanvas').on('click', () => {
    d3.select('#content').html('');
    usingWebGL = !d3.event.target.checked;
    restart();
});

const clickType = typeName => () => {
    shapeType = typeName;
    restart();
    d3.select('#stackOption').style('visibility', typeName === 'Line' ? 'hidden' : '');
    d3.select('#borderOption').style('visibility', typeName === 'Line' ? 'hidden' : '');
};

d3.select('#shapesLine').on('click', clickType('Line'));
d3.select('#shapesBar').on('click', clickType('Bar'));
d3.select('#shapesArea').on('click', clickType('Area'));

d3.select('#stackData').on('click', () => {
    stackData = d3.event.target.checked;
    generateData(true);
    restart();
});

d3.select('#withBorders').on('click', () => {
    showBorders = d3.event.target.checked;
    requestRender();
});

d3.select('#showFPS').on('click', () => {
    if (d3.event.target.checked) {
        start();
    } else {
        stop();
    }
});

let lastTime = 0;
let times = [];
let i = 0;

const showFPS = (t) => {
    const firstTime = lastTime === 0;
    const dt = t - lastTime;
    lastTime = t;
    if (firstTime) return;

    times.push(dt);
    i++;
    if (times.length > 100) times.splice(0, 1);
    if (i > 10) {
        i = 0;
        const avg = times.reduce((s, t) => s + t, 0) / times.length;
        const fpsValue = 1000 / avg;
        const fpsText = fpsValue > 10 ? Math.floor(fpsValue) : Math.floor(fpsValue * 10) / 10;
        d3.select('#fps').text(`fps: ${fpsText}`);
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

let sliderTimeout = null;
const pointSlider = window.slider().max(2000000).value(numPoints).on('change', value => {
    d3.select('#content').html('');
    if (sliderTimeout) clearTimeout(sliderTimeout);
    sliderTimeout = setTimeout(() => {
        numPoints = value;

        generateData();
        reset();

        requestRender();
    }, 250);
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

const reset = () => {
    times = [];
    chart = createChart(usingWebGL);
};

const restart = () => {
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
