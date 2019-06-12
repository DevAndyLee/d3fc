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

const generateData = () => {
    numPerSeries = Math.floor(numPoints / colors.length);
    let lastSeries = null;
    data = colors.map((_, colorIndex) => {
        const asLines = shapeType === 'Line';
        const floatArray = (usingWebGL && asLines);
        const series = floatArray ? new Float32Array(numPerSeries * 2) : [];
        let index = 0;
        let date = new Date(startDate);
        for (let n = 0; n < numPerSeries; n++) {
            const b = (lastSeries && !asLines) ? lastSeries[n].y : colorIndex * 100;
            const item = {
                x: date,
                y: b + 10 + Math.random() * 80,
                b
            };

            if (floatArray) {
                series[index++] = item.x;
                series[index++] = item.y;
            } else {
                series.push(item);
            }

            const newDate = new Date(date);
            newDate.setHours(newDate.getHours() + 1);
            date = newDate;
        }
        xScale.domain([startDate, date]);
        lastSeries = series;
        return series;
    })
    xCopy.domain(xScale.domain());
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
                if (shapeType == 'Line') {
                    context.strokeStyle = color + '';
                } else {
                    if (showBorders) {
                        context.strokeStyle = color + '';
                        color.opacity = 0.5;
                    }
                    context.fillStyle = color + '';
                }
            });
        if (shapeType != 'Line') {
            series.baseValue(d => d.b);
        }
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

d3.select('#seriesCanvas').on('click', () => restart(!d3.event.target.checked));

d3.select('#shapesLine').on('click', () => {
    shapeType = 'Line';
    restart(usingWebGL);
});
d3.select('#shapesBar').on('click', () => {
    shapeType = 'Bar';
    restart(usingWebGL);
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
    const dt = t - lastTime;
    lastTime = t;
    times.push(dt);
    i++;
    if (times.length > 100) times.splice(0, 1);
    if (i > 10) {
        i = 0;
        const avg = times.reduce((s, t) => s + t, 0) / times.length;
        const fpsValue = 1000 / avg;
        const fpsText = fpsValue > 10 ? Math.floor(fpsValue): Math.floor(fpsValue * 10) / 10;
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

const pointSlider = window.slider().max(2000000).value(numPoints).on('change', value => {
    numPoints = value;
    generateData();

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
        times= [];
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
