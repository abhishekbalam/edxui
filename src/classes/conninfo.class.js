class Conninfo {
    constructor(parentId) {
        if (!parentId) throw "Missing parameters";

        this.si = require("systeminformation");

        // Create DOM
        this.parent = document.getElementById(parentId);
        this.parent.innerHTML += `<div id="mod_conninfo">
            <div id="mod_conninfo_innercontainer">
                <h1>NETWORK TRAFFIC<i>UP / DOWN, MB/S</i></h1>
                <h2>TOTAL<i>0B OUT, 0B IN</i></h2>
                <canvas id="mod_conninfo_canvas_top"></canvas>
                <canvas id="mod_conninfo_canvas_bottom"></canvas>
                <h3>OFFLINE</h3>
            </div>
        </div>`;

        this.total = document.querySelector("#mod_conninfo_innercontainer > h2 > i");
        this._pb = require("pretty-bytes");

        // Init Smoothie
        let TimeSeries = require("smoothie").TimeSeries;
        let SmoothieChart = require("smoothie").SmoothieChart;

        // Set chart options
        let chartOptions = [{
            limitFPS: 40,
            responsive: true,
            millisPerPixel: 70,
            interpolation: 'linear',
            grid:{
                millisPerLine: 5000,
                fillStyle:'transparent',
                strokeStyle:`rgba(${window.theme.r},${window.theme.g},${window.theme.b},0.4)`,
                verticalSections:3,
                borderVisible:false
            },
            labels:{
                fontSize: 10,
                fillStyle: `rgb(${window.theme.r},${window.theme.g},${window.theme.b})`,
                precision: 2
            }
        }];
        chartOptions.push(Object.assign({}, chartOptions[0]));  // Deep copy object, see http://jsben.ch/bWfk9
        chartOptions[0].minValue = 0;
        chartOptions[1].maxValue = 0;

        // Create chart
        this.series = [new TimeSeries(), new TimeSeries()];
        this.charts = [new SmoothieChart(chartOptions[0]), new SmoothieChart(chartOptions[1])];

        this.charts[0].addTimeSeries(this.series[0], {lineWidth:1.7,strokeStyle:`rgb(${window.theme.r},${window.theme.g},${window.theme.b})`});
        this.charts[1].addTimeSeries(this.series[1], {lineWidth:1.7,strokeStyle:`rgb(${window.theme.r},${window.theme.g},${window.theme.b})`});

        this.charts[0].streamTo(document.getElementById("mod_conninfo_canvas_top"), 1000);
        this.charts[1].streamTo(document.getElementById("mod_conninfo_canvas_bottom"), 1000);

        // Init updater
        this.updateInfo();
        this.infoUpdater = setInterval(() => {
            this.updateInfo();
        }, 1000);
    }
    updateInfo() {
        this.si.networkInterfaces((data) => {
            let net = data[0];
            let netID = 0;
            while (net.internal === true) {
                netID++;
                if (data[netID] !== undefined) {
                    net = data[netID];
                } else {
                    break;
                }
            }

            let time = new Date().getTime();

            if (window.mods.netstat.offline) {
                this.series[0].append(time, 0);
                this.series[1].append(time, 0);
                document.querySelector("div#mod_conninfo").setAttribute("class", "offline");
                return;
            } else {
                document.querySelector("div#mod_conninfo").setAttribute("class", "");
                this.si.networkStats(net.iface, (data) => {

                    let max0 = this.series[0].maxValue;
                    let max1 = -this.series[1].minValue;
                    if (max0 > max1) {
                        this.series[1].minValue = -max0;
                    } else if (max1 > max0) {
                        this.series[0].maxValue = max1;
                    }

                    this.series[0].append(time, data.tx_sec/125000);
                    this.series[1].append(time, -data.rx_sec/125000);

                    this.total.innerText = `${this._pb(data.tx)} OUT, ${this._pb(data.rx)} IN`.toUpperCase();
                });
            }
        });
    }
}

module.exports = {
    Conninfo
};
