class Cpuinfo {
    constructor(parentId) {
        if (!parentId) throw "Missing parameters";

        this.si = require("systeminformation");

        // Create initial DOM
        this.parent = document.getElementById(parentId);
        this.parent.innerHTML += `<div id="mod_cpuinfo">
        </div>`;
        this.container = document.getElementById("mod_cpuinfo");

        // Init Smoothie
        let TimeSeries = require("smoothie").TimeSeries;
        let SmoothieChart = require("smoothie").SmoothieChart;

        this.series = [];
        this.charts = [];
        this.si.cpu((data) => {
            let divide = Math.floor(data.cores/2);
            this.divide = divide;

            let innercontainer = document.createElement("div");
            innercontainer.setAttribute("id", "mod_cpuinfo_innercontainer");
            innercontainer.innerHTML = `<h1>CPU USAGE<i>${data.manufacturer} ${data.brand}</i></h1>
                <div>
                    <h1># <em>1</em> - <em>${divide}</em><br>
                    <i id="mod_cpuinfo_usagecounter0">Avg. --%</i></h1>
                    <canvas id="mod_cpuinfo_canvas_0" height="60"></canvas>
                </div>
                <div>
                    <h1># <em>${divide+1}</em> - <em>${data.cores}</em><br>
                    <i id="mod_cpuinfo_usagecounter1">Avg. --%</i></h1>
                    <canvas id="mod_cpuinfo_canvas_1" height="60"></canvas>
                </div>
                <div>
                    <div>
                        <h1>TEMP<br>
                        <i id="mod_cpuinfo_temp">--°C</i></h1>
                    </div>
                    <div>
                        <h1>MIN<br>
                        <i id="mod_cpuinfo_speed_min">--GHz</i></h1>
                    </div>
                    <div>
                        <h1>MAX<br>
                        <i id="mod_cpuinfo_speed_max">--GHz</i></h1>
                    </div>
                    <div>
                        <h1>TASKS<br>
                        <i id="mod_cpuinfo_tasks">---</i></h1>
                    </div>
                </div>`;
            this.container.append(innercontainer);

            for (var i = 0; i < 2; i++) {
                this.charts.push(new SmoothieChart({
                    limitFPS: 30,
                    responsive: true,
                    millisPerPixel: 50,
                    grid:{
                        fillStyle:'transparent',
                        strokeStyle:'transparent',
                        verticalSections:0,
                        borderVisible:false
                    },
                    labels:{
                        disabled: true
                    },
                    yRangeFunction: () => {
                        return {min:0,max:100};
                    }
                }));
            }

            for (var i = 0; i < data.cores; i++) {
                // Create TimeSeries
                this.series.push(new TimeSeries());

                let serie = this.series[i];
                let options = {
                    lineWidth: 1.7,
                    strokeStyle: `rgb(${window.theme.r},${window.theme.g},${window.theme.b})`
                };

                if (i < divide) {
                    this.charts[0].addTimeSeries(serie, options);
                } else {
                    this.charts[1].addTimeSeries(serie, options);
                }
            }

            for (var i = 0; i < 2; i++) {
                this.charts[i].streamTo(document.getElementById(`mod_cpuinfo_canvas_${i}`), 500);
            }

            // Init updater
            this.updateCPUload();
            this.updateCPUtemp();
            this.updateCPUspeed();
            this.updateCPUtasks();
            this.loadUpdater = setInterval(() => {
                this.updateCPUload();
            }, 500);
            this.tempUpdater = setInterval(() => {
                this.updateCPUtemp();
            }, 2000);
            this.speedUpdater = setInterval(() => {
                this.updateCPUspeed();
            }, 1000);
            this.tasksUpdater = setInterval(() => {
                this.updateCPUtasks();
            }, 5000);
        });
    }
    updateCPUload() {
        this.si.currentLoad((data) => {
            let average = [[], []];

            if (!data.cpus) return; // Prevent memleak in rare case where systeminformation takes extra time to retrieve CPU info (see github issue #216)
            
            data.cpus.forEach((e, i) => {
                this.series[i].append(new Date().getTime(), e.load);

                if (i < this.divide) {
                    average[0].push(e.load);
                } else {
                    average[1].push(e.load);
                }
            });
            average.forEach((stats, i) => {
                average[i] = Math.round(stats.reduce((a, b) => a + b, 0)/stats.length);

                try {
                    document.getElementById(`mod_cpuinfo_usagecounter${i}`).innerText = `Avg. ${average[i]}%`;
                } catch(e) {
                    // Fail silently, DOM element is probably getting refreshed (new theme, etc)
                }
            });
        });
    }
    updateCPUtemp() {
        this.si.cpuTemperature((data) => {
            try {
                document.getElementById("mod_cpuinfo_temp").innerText = `${data.main}°C`;
            } catch(e) {
                // See above notice
            }
        });
    }
    updateCPUspeed() {
        this.si.cpuCurrentspeed((data) => {
            try {
                document.getElementById("mod_cpuinfo_speed_min").innerText = `${data.min}GHz`;
                document.getElementById("mod_cpuinfo_speed_max").innerText = `${data.max}GHz`;
            } catch(e) {
                // See above notice
            }
        });
    }
    updateCPUtasks() {
        this.si.processes((data) => {
            try {
                document.getElementById("mod_cpuinfo_tasks").innerText = `${data.all}`;
            } catch(e) {
                // See above notice
            }
        });
    }
}

module.exports = {
    Cpuinfo
};
