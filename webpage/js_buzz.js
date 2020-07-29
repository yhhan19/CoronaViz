let animating = false;

const map = L.map('map', {'worldCopyJump': true});

// Set Default view to South America as requested by Hanan
const south_america_bb = [[5.44, -73.83], [-34.67, -34.98]];
map.fitBounds(south_america_bb);

function selectMarkerByName(name) {
  console.log(name);
  if (jhuLayer && jhuLayer.markers._gridClusters) {
    const gridClustered = jhuLayer.markers._gridClusters[map.getZoom()];
    const gridUnclustered = jhuLayer.markers._gridUnclustered[map.getZoom()];

    const marker = {m: undefined};
    gridClustered.eachObject(function (e) {
      if (e.getAllChildMarkers().some((m) => m.name === name)) {
        this.m = e;
      }
    }, marker);
    gridUnclustered.eachObject(function (e) {
      if (e.name === name) {
        this.m = e;
      }
    }, marker);
    info.updateForMarker(marker.m);
    updateSidebarForMarker(marker.m);
  } else {
    console.log('cluster not initialized');
  }
}


let sidebar_selected_marker;
let selected_marker;
map.on('zoomend', function (e) {
  selected_marker = undefined;
  sidebar_selected_marker = undefined;
  info.clear();
});

let floating_box = document.getElementById("float_toggle").checked;
// weird hack becuase on click isn't working
let last_latlng = undefined;
map.on('mousemove', function (e) {
  const map_bounds = document.getElementById('map').getBoundingClientRect();
  let info_bouds;
  if (floating_box) { 
    if (info._div) {
      const left = Math.round(e.containerPoint.x);
      const top = Math.round(e.containerPoint.y);

      info._div.style.left = left + "px";
      info._div.style.top = top + "px";

      info_bounds = info._div.getBoundingClientRect();

      if(info_bounds.right > map_bounds.right) {
        info._div.style.left = (left - (info_bounds.right - map_bounds.right)) + "px";
      }
      if(info_bounds.bottom > map_bounds.bottom) {
        info._div.style.top = (top - (info_bounds.bottom - map_bounds.bottom)) + "px";
      }
    }
  } else {
      info_bounds = info._div.getBoundingClientRect();
      info._div.style.left = (map_bounds.right - 125) + "px";
      info._div.style.top = "0px";
  }
  last_latlng = e.latlng;
  info.updateForMarker(getClosestMarker(e.latlng));
});

map.on('click', updateSidebarForEvent);
map.on('dblclick', resetClickTimeout);

// Hack so that sidebar is not set of double clicks
map.clicked = 0;
function updateSidebarForEvent(e) {
  map.clicked = 1;
  setTimeout(function (){
    if(map.clicked === 1) {
      if (last_latlng) {
        updateSidebarForMarker(getClosestMarker(last_latlng));
      }
      map.clicked = 0;
    }
  }, 250);
}

function resetClickTimeout() {
  map.clicked = 0;
}

function percent(confirmed, population) {
  if (population == 0) return 0;
  const rate = confirmed * 100000 / population;
  return rate.toFixed(2);
}

function percent2(deaths, confirmed) {
  if (confirmed == 0) return "0.00%";
  const rate = deaths * 100 / confirmed;
  return rate.toFixed(2) + "%";
}

function getClosestMarker(latlng) {
  if (jhuLayer && jhuLayer.markers._gridClusters) {
    const gridClustered = jhuLayer.markers._gridClusters[map.getZoom()];
    const gridUnclustered = jhuLayer.markers._gridUnclustered[map.getZoom()];
    const point = map.project(latlng);

    const minDist = {marker: undefined, dist: undefined};
    gridClustered.eachObject(function (e) {
      const dist = gridClustered._sqDist(gridClustered._objectPoint[L.Util.stamp(e)], point);
      if (!this.dist || dist < this.dist) {
        this.marker = e;
        this.dist = dist;
      }
    }, minDist)
    gridUnclustered.eachObject(function (e) {
      const dist = gridUnclustered._sqDist(gridUnclustered._objectPoint[L.Util.stamp(e)], point);
      if (!this.dist || dist < this.dist) {
        this.marker = e;
        this.dist = dist;
      }
    }, minDist)
    if (minDist.marker) {
      return minDist.marker;
    } else {
      console.log('no marker found');
    }
  } else {
    console.log('cluster not initialized');
  }

}

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}' + (L.Browser.retina ? '@2x.png' : '.png'), {
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 20,
  minZoom: 0
}).addTo(map);

let info = {};
info._div = document.getElementById("info");

info.update = function (confirmed, deaths, recoveries, active, placenames, population) {
  confirmed = normalizeCount(confirmed);
  deaths = normalizeCount(deaths);
  active = normalizeCount(active);
  recoveries = normalizeCount(recoveries);
  population = population;

  placenames = placenamesString(placenames);
  this._div.innerHTML = (placenames !== undefined ? "<b>" + placenames + "</b><br>" : "") +
      "Population: " + population + "<br>" +
      "Confirmed: " + confirmed + "<br>" +
      "Deaths: " + deaths + "<br>" +
      "Recoveries:" + recoveries + "<br>" +
      "Active:" + active + "<br>" +
      "Incidence Rate: " + percent(confirmed, population) + "<br>" +
      "Mortality Rate: " + percent2(deaths, confirmed) + "<br>";
};

function placenamesString(placenames) {
  if (Array.isArray(placenames)) {
    let truncated = false;
    placenames = placenames.reduce(function (names_str, next) {
      const new_names_str = names_str + next + "; ";
      if (new_names_str.length <= 100) {
        return new_names_str;
      } else {
        truncated = true;
        return names_str;
      }
    }, "");
    if (truncated) {
      placenames = placenames + "etc.";
    } else {
      placenames = placenames.substring(0, placenames.length - 2);
    }
  }
  return placenames;
}

function updateSidebarInfo(confirmed, deaths, recoveries, active, placenames, population) {
  document.getElementById("sidebar_confirmed").innerHTML = normalizeCount(confirmed);
  document.getElementById("sidebar_deaths").innerHTML = normalizeCount(deaths);
  document.getElementById("sidebar_recoveries").innerHTML = normalizeCount(recoveries);
  document.getElementById("sidebar_active").innerHTML = normalizeCount(active);
  document.getElementById("sidebar_location").innerHTML = placenamesString(placenames);
  document.getElementById("sidebar_population").innerHTML = population;
  document.getElementById("sidebar_incidence").innerHTML = percent(normalizeCount(confirmed), population);
  document.getElementById("sidebar_mortality").innerHTML = percent2(normalizeCount(deaths), confirmed)
}

function getMarkerStatistic(marker) {
  let confirmed, deaths, recoveries, active, names, population;
  if (marker.getAllChildMarkers) {
    confirmed = marker.getAllChildMarkers().reduce((a, v) => a + v.confirmed, 0);
    deaths = marker.getAllChildMarkers().reduce((a, v) => a + v.deaths, 0);
    recoveries = marker.getAllChildMarkers().reduce((a, v) => a + v.recoveries, 0);
    active = marker.getAllChildMarkers().reduce((a, v) => a + v.active, 0);
    names = marker.getAllChildMarkers().slice().filter((e) => e.name === 'Brazil' || e.confirmed > 0).sort((a, b) => a.confirmed - b.confirmed).reverse().map((v) => v.name);
    population = marker.getAllChildMarkers().reduce((a, v) => a + v.population, 0);
  } else {
    confirmed = marker.confirmed;
    deaths = marker.deaths;
    recoveries = marker.recoveries;
    active = marker.active;
    names = marker.name;
    population = marker.population;
  }
  return [confirmed, deaths, recoveries, active, names, population];
}

function updateSidebarForMarker(marker) {
  const [confirmed, deaths, recoveries, active, names, population] = getMarkerStatistic(marker);
  updateSidebarInfo(confirmed, deaths, recoveries, active, names, population);
  sidebar_selected_marker = marker;
}

info.clear = function () {
  this._div.innerHTML = "Hover over or click marker";
}

info.updateForMarker = function (marker) {
  if (selected_marker && selected_marker._icon) {
    selected_marker._icon.classList.remove('selected');
  }

  const [confirmed, deaths, recoveries, active, names, population] = getMarkerStatistic(marker);
  if (marker._icon) {
    marker._icon.classList.add('selected');
  }
  info.update(confirmed, deaths, recoveries, active, names, population);

  selected_marker = marker;
}


info.clear();

const country_select = document.getElementById("country_select");
const sorted_options = Object.entries(bounding_boxes).sort(function (a, b) {
  return a[1][0].localeCompare(b[1][0])
});
for (let e of sorted_options) {
  const key = e[0];
  const label = e[1][0];
  const option = document.createElement("option");
  const textnode = document.createTextNode(label);
  option.appendChild(textnode);
  option.value = key;
  if (label === 'Brazil') {
    option.selected = true;
  }
  country_select.appendChild(option);
}

let dataEndDate;
let dataStartDate;
let displayStartDate;
let displayEndDate;

let animateWindow = 24*60 * parseInt(document.getElementById('animate_window').value);
let animateStep = 24 * 60;
let animateSpeed = 100;
let dailyRate = document.getElementById("daily_rate").checked;
let animation_paused = false;
let log_scale = document.getElementById("log").checked;
let pop_scale = document.getElementById("rate").checked;
let tempAnimateWindow = 7 * 60 * 24;
let animate_window_max = document.getElementById("animate_max").checked
if(animate_window_max) {
  tempAnimateWindow = animateWindow;
  document.getElementById('animate_window').disabled = true;
}
let totalAnimation = document.getElementById("total_animation").checked;
if(totalAnimation) {
  document.getElementById('animate_window').disabled = true;
  animateWindow = 0;
}

const slider_range = $("#slider-range");
slider_range.slider({
  range: true,
  min: 0,
  max: 100,
  values: [0, animateWindow],
  slide: function (event, ui) {
    if (totalAnimation) {
      if (ui.handleIndex == 1) {
        const displayStartMins = dateToEpochMins(dataStartDate);
        const displayEndMins = ui.values[1];
        setDisplayedDateRange(displayStartMins, displayEndMins);
      }
      else {
        slider_range.slider("values", [displayStartMins, displayEndMins]);
      }
    }
    else {
      switch(ui.handleIndex) {
        case 0:
          if (ui.values[0] + animateWindow <= dateToEpochMins(dataEndDate)) {
            const displayStartMins = ui.values[0];
            const displayEndMins = ui.values[0] + animateWindow;
            setDisplayedDateRange(displayStartMins, displayEndMins);
            animateWindow = displayEndMins - displayStartMins;
            document.getElementById('animatTe_window').value = Math.floor((displayEndMins - displayStartMins)/(60*24));
          }
          else {
            slider_range.slider("values", [dateToEpochMins(dataEndDate) - animateWindow, dateToEpochMins(dataEndDate)]);
            animateWindow = displayEndMins - displayStartMins;
            document.getElementById('animate_window').value = Math.floor((displayEndMins - displayStartMins)/(60*24));
          }
          break;
        case 1:
          if (ui.values[1] - animateWindow >= dateToEpochMins(dataStartDate)) {
            const displayStartMins = ui.values[1] - animateWindow;
            const displayEndMins = ui.values[1];
            setDisplayedDateRange(displayStartMins, displayEndMins);
            animateWindow = displayEndMins - displayStartMins;
            document.getElementById('animate_window').value = Math.floor((displayEndMins - displayStartMins)/(60*24));
          }
          else {
            slider_range.slider("values", [dateToEpochMins(dataStartDate), dateToEpochMins(dataStartDate) + animateWindow]);
            animateWindow = displayEndMins - displayStartMins;
            document.getElementById('animate_window').value = Math.floor((displayEndMins - displayStartMins)/(60*24));
          }
          break;
      }
    }
  }
});

function calcScale(value) {
  const maxScale = 10.0;
  const minScale = 0.5;
  if (value <= 50) {
    return value * (1 - minScale) / 50 + minScale;
  }
  else {
    return value * (maxScale - 1) / 50 + 2 - maxScale;
  }
}

const mortality_slider = document.getElementById('mortality_size');
mortality_slider.oninput = function() {
  mortality_scale = calcScale(this.value);
  setDisplayedDateRange(displayStartDate, displayEndDate);
}
let mortality_scale = 1;

const incidence_slider = document.getElementById('incidence_size');
incidence_slider.oninput = function() {
  incidence_scale = calcScale(this.value);
  setDisplayedDateRange(displayStartDate, displayEndDate);
}
let incidence_scale = 1;

const confirmed_slider = document.getElementById('confirmed_size');
confirmed_slider.oninput = function() {
  confirmed_scale = calcScale(this.value);
  setDisplayedDateRange(displayStartDate, displayEndDate);
}
let confirmed_scale = 1;

const deaths_slider = document.getElementById('deaths_size');
deaths_slider.oninput = function() {
  deaths_scale = calcScale(this.value);
  setDisplayedDateRange(displayStartDate, displayEndDate);
}
let deaths_scale = 1;

const recoveries_slider = document.getElementById('recoveries_size');
recoveries_slider.oninput = function() {
  recoveries_scale = calcScale(this.value);
  setDisplayedDateRange(displayStartDate, displayEndDate);
}
let recoveries_scale = 1;

const active_slider = document.getElementById('active_size');
active_slider.oninput = function() {
  active_scale = calcScale(this.value);
  setDisplayedDateRange(displayStartDate, displayEndDate);
}
let active_scale = 1;

function resetScale() {
  document.getElementById("mortality_size").value = 
  document.getElementById("incidence_size").value =
  document.getElementById("confirmed_size").value =
  document.getElementById("deaths_size").value = 
  document.getElementById("recoveries_size").value = 
  document.getElementById("active_size").value = "50";
  mortality_scale = incidence_scale = deaths_scale = confirmed_scale = recoveries_scale = active_scale = 1;
  setDisplayedDateRange(displayStartDate, displayEndDate);
}

selected_marker = undefined;
sidebar_selected_marker = undefined;

class NewsStandDataLayer {
  constructor(plottingLayer, color_fn, url_fn) {
    const that = this;
    this.markers = L.markerClusterGroup({
      chunkedLoading: true,
      chunkProgress: updateProgressBar,
      iconCreateFunction: function (cluster) {
        const childCount = cluster.getAllChildMarkers().reduce((a, v) => a + v.count, 0);
        return that.markerIcon(childCount);
      }
    });
    this.markers.on('spiderfied', function (a) {
      const allArticles = a.markers.flatMap(function (m) {
        return m.articles
      });
      L.popup({maxHeight: 200}).setLatLng(a.cluster.getLatLng()).setContent(that.makePopupHtml(allArticles, a.markers[0].name)).openOn(map);
    });
    map.addLayer(this.markers);

    this.plottingLayer = plottingLayer;
    this.color_fn = color_fn;
    this.url_fn = url_fn;
    this.markerList = [];


    this.display_start_date = undefined;
  }

  togglePlotting() {
    this.plottingLayer = !this.plottingLayer;

    if (this.plottingLayer) {
      const subMarkerList = this.markersBetween(displayStartDate, displayEndDate);
      this.markers.clearLayers();
      this.markers.addLayers(subMarkerList);
    } else {
      this.markers.clearLayers();
    }
  }

  markersBetween(timeStart, timeEnd) {
    const iStart = nodeIndexOfTime(this.nodeList.map((e) => e.time), timeStart);
    const iEnd = nodeIndexOfTime(this.nodeList.map((e) => e.time), timeEnd);
    return this.markerList.slice(iStart, iEnd);
  }

  setMarkers(nodes) {
    this.markers.clearLayers();
    this.nodeList = nodes;
    const that = this;
    this.markerList = this.nodeList.map(function (p) {
      const marker = new L.Marker(L.latLng(p.lat, p.lng), {icon: that.markerIcon(p.count)});
      let articles;
      if (p.articles) {
        articles = JSON.parse(p.articles);
        articles = articles.map(function (a) {
          return {title: a['f1'], url: a['f2']};
        });
      } else {
        articles = [];
      }
      marker.bindPopup(that.makePopupHtml(articles, p.name), {maxHeight: 100});
      marker.count = p.count;
      marker.name = p.name;
      marker.articles = articles;
      return marker;
    });
    if (this.plottingLayer) {
      this.markers.addLayers(this.markerList);
    }
  }

  updateLayer() {
    terminateAnimation();
    const loader = document.getElementById('loader');
    loader.style.display = 'block';

    const that = this;
    return new Promise(function (resolve, reject) {
      const url = that.url_fn();
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.onload = function (e) {
        if (xhr.readyState === 4) {
          loader.style.display = 'none';
          if (xhr.status === 200) {
            const nodes = JSON.parse(xhr.responseText);
            that.setMarkers(nodes);
            resolve();
          } else {
            console.error(xhr.statusText);
            reject();
          }
        }
      }
      xhr.send();
    });
  }

  makePopupHtml(articles, name) {
    const articles_html = articles.map(function (e) {
      return "<li><a href=" + e.url + ">" + e.title + "</a></li>";
    }).join("");
    return "<em>" + name + "</em><br><ol>" + articles_html + "</ol>";
  }

  markerIcon(clusterSize) {
    const size = markerSize(clusterSize, -1);
    const color = this.color_fn(clusterSize);

    const elemStyle =
        'border-radius: 50%;' +
        'width: ' + size + 'px;' +
        'height: ' + size + 'px;' +
        'line-height: ' + size + 'px;' +
        'font-weight: bold;' +
        'background-color: ' + color + ';';

    return new L.DivIcon({
      html: '<div style="' + elemStyle + '">' + clusterSize + '</div>',
      className: 'marker-cluster',
      iconSize: new L.Point(size, size)
    });
  }

  plotData(timeStart, timeEnd) {
    let subMarkerList;
    if (this.plottingLayer) {
      // Special handeling for incremental animation
      if (this.display_start_date === timeStart && timeEnd > this.display_end_date) {
        subMarkerList = this.markersBetween(this.display_end_date, timeEnd);
        this.markers.addLayers(subMarkerList);
        this.display_end_date = timeEnd;
      } else {
        this.display_start_date = timeStart;
        this.display_end_date = timeEnd;
        subMarkerList = this.markersBetween(timeStart, timeEnd);
        this.markers.clearLayers();
        this.markers.addLayers(subMarkerList);
      }
    }
  }

}

class JHUDataLayer {
  constructor(plottingConfirmed, plottingDeaths, plottingRecoveries, plottingActive, plottingIncidence, plottingMortality) {
    this.timeSeries = jhuData;

    const that = this;
    this.markers = L.markerClusterGroup({
      chunkedLoading: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: false,
      iconCreateFunction: function (cluster) {
        const confirmed = cluster.getAllChildMarkers().reduce((a, v) => a + v.confirmed, 0);
        const deaths = cluster.getAllChildMarkers().reduce((a, v) => a + v.deaths, 0);
        const recoveries = cluster.getAllChildMarkers().reduce((a, v) => a + v.recoveries, 0);
        const active = that.computeActive(confirmed, deaths, recoveries);
        const population = cluster.getAllChildMarkers().reduce((a, v) => a + v.population, 0);
        return that.layerIcon(confirmed, deaths, recoveries, active, population);
      }
    });
    this.markers.on('click',updateSidebarForEvent);
    this.markers.on('clusterclick',updateSidebarForEvent);
    this.markers.on('dblclick',resetClickTimeout);
    this.markers.on('clusterdblclick',resetClickTimeout);

    this.timeSeriesMarkers = this.timeSeries.map(function (p) {
      const marker = L.marker([p.lat, p.lng]);
      marker.name = p.name;
      marker.population = parseInt(p.pop);
      if (isNaN(marker.population)) 
        marker.population = 0;
      marker.time_series = p.time_series;
      return marker;
    });

    this.markers.clearLayers();
    this.markers.addLayers(this.timeSeriesMarkers)

    this.subLayers = {
      confirmed: {plotting: plottingConfirmed},
      deaths: {plotting: plottingDeaths},
      recoveries: {plotting: plottingRecoveries},
      active: {plotting: plottingActive},
      incidence: {plotting: plottingIncidence},
      mortality: {plotting: plottingMortality}
    };
    if (this.plottingAny()) {
      map.addLayer(this.markers);
      this.plotData(displayStartDate, displayEndDate);
    }
  }

  plottingAny() {
    return Object.values(this.subLayers).reduce(
        function (a, b) {
          return a || b.plotting;
        },
        false);
  }

  togglePlotting(subLayer) {
    if (!this.plottingAny()) {
      map.addLayer(this.markers);
    }
    this.subLayers[subLayer].plotting = !this.subLayers[subLayer].plotting;
    if (this.plottingAny()) {
      this.plotData(displayStartDate, displayEndDate);
    } else {
      map.removeLayer(this.markers);
    }
  }

  plotData(timeStart, timeEnd) {
    if (this.plottingAny()) {
      for (let i = 0; i < this.timeSeriesMarkers.length; i++) {
        const m = this.timeSeriesMarkers[i];

        let iStart = nodeIndexOfTime(m.time_series.map((e) => e[0]), timeStart);
        const iEnd = nodeIndexOfTime(m.time_series.map((e) => e[0]), timeEnd);

        if (iStart === iEnd && iStart > 0) {
          iStart = iStart - 1;
        }

        const entryStart = m.time_series[iStart];
        const entryEnd = m.time_series[iEnd];

        const confirmed = entryEnd[1] - entryStart[1];
        const deaths = entryEnd[2] - entryStart[2];
        const recoveries = entryEnd[3] - entryStart[3];
        const active = this.computeActive(confirmed, deaths, recoveries);
        const population = m.population;

        const icon = this.layerIcon(confirmed, deaths, recoveries, active, population);
        m.setIcon(icon)

        m.confirmed = confirmed;
        m.deaths = deaths;
        m.recoveries = recoveries;
        m.active = active;
      }
      this.markers.refreshClusters();
    }
  }

  isTimeWindowEmpty() {
    for (let i = 0; i < this.timeSeriesMarkers.length; i++) {
      if (this.timeSeriesMarkers[i].confirmed > 0 ||
          this.timeSeriesMarkers[i].deaths > 0 ||
          this.timeSeriesMarkers[i].recoveries > 0) {
        return false;
      }
    }
    return true;
  }

  computeActive(confirmed, deaths, recoveries) {
    return confirmed - (deaths + recoveries);
  }

  layerIcon(confirmed, deaths, recovered, active, population) {

      const confirmedSize = markerSize(confirmed, 0);
      let confirmedStyle =
          'position: relative;' +
          'font-weight: bolder;' +
          'border-radius: 50%;' +
          'line-height: ' + confirmedSize + 'px;' +
          'width: ' + confirmedSize + 'px;' +
          'height: ' + confirmedSize + 'px;';

      if (this.subLayers.confirmed.plotting) {
        confirmedStyle += 'border: dotted black ;';
      }

      const deathsSize = markerSize(deaths, 1);
      const deathsStyle =
          'position: absolute;' +
          'border-radius: 50%;' +
          'top: 50%;' +
          'left: 50%;' +
          'margin: ' + (-deathsSize / 2) + 'px 0px 0px ' + (-deathsSize / 2) + 'px;' +
          'width: ' + deathsSize + 'px;' +
          'height: ' + deathsSize + 'px;' +
          'border: dotted red ;';
      
      const recoveredSize = markerSize(recovered, 2);
      const recoveredStyle =
          'position: absolute;' +
          'border-radius: 50%;' +
          'top: 50%;' +
          'left: 50%;' +
          'margin: ' + (-recoveredSize / 2) + 'px 0px 0px ' + (-recoveredSize / 2) + 'px;' +
          'width: ' + recoveredSize + 'px;' +
          'height: ' + recoveredSize + 'px;' +
          'border: dotted green ;';

      const activeSize = markerSize(active, 3);
      const activeStyle =
          'position: absolute;' +
          'border-radius: 50%;' +
          'top: 50%;' +
          'left: 50%;' +
          'margin: ' + (-activeSize / 2) + 'px 0px 0px ' + (-activeSize / 2) + 'px;' +
          'width: ' + activeSize + 'px;' +
          'height: ' + activeSize + 'px;' +
          'border: dotted orange ;';
        
      const incidenceSize = markerSize2(confirmed, population, 0);
      const incidenceStyle =
        'position: absolute;' +
        'border-radius: 50%;' +
        'top: 50%;' +
        'left: 50%;' +
        'margin: ' + (-incidenceSize / 2) + 'px 0px 0px ' + (-incidenceSize / 2) + 'px;' +
        'width: ' + incidenceSize + 'px;' +
        'height: ' + incidenceSize + 'px;' +
        'border: solid black ;';
      
      const mortalitySize = markerSize2(deaths, confirmed, 1);
      const mortalityStyle =
          'position: absolute;' +
          'border-radius: 50%;' +
          'top: 50%;' +
          'left: 50%;' +
          'margin: ' + (-mortalitySize / 2) + 'px 0px 0px ' + (-mortalitySize / 2) + 'px;' +
          'width: ' + mortalitySize + 'px;' +
          'height: ' + mortalitySize + 'px;' +
          'border: solid red ;';
      
      if ((confirmed + deaths + recovered) === 0) {
        confirmedStyle += 'display: none;';
      }

      return new L.DivIcon({
        html: '<div class="circle" style="' + confirmedStyle + '">' +
            (this.subLayers.incidence.plotting && deaths > 0 ? '<div class="circle" style="' + incidenceStyle + '"></div>' : '') +
            (this.subLayers.mortality.plotting && deaths > 0 ? '<div class="circle" style="' + mortalityStyle + '"></div>' : '') +
            (this.subLayers.deaths.plotting && deaths > 0 ? '<div class="circle" style="' + deathsStyle + '"></div>' : '') +
            (this.subLayers.recoveries.plotting && recovered > 0 ? '<div class="circle" style="' + recoveredStyle + '"></div>' : '') +
            (this.subLayers.active.plotting && active > 0 ? '<div class="circle" style="' + activeStyle + '"></div>' : '') +
            '</div>',
        className: 'marker-cluster',
        iconSize: new L.Point(confirmedSize, confirmedSize)
      });
    }
}

const confirmedCasesSelected = document.getElementById("confirmed_checkbox").checked;
const deathsSelected = document.getElementById("deaths_checkbox").checked;
const recoveredSelected = document.getElementById("recoveries_checkbox").checked;
const activeSelected = document.getElementById("active_checkbox").checked;
const incidenceSelected = document.getElementById("incidence_checkbox").checked;
const mortalitySelected = document.getElementById("mortality_checkbox").checked;
const jhuLayer = new JHUDataLayer(confirmedCasesSelected, deathsSelected, recoveredSelected, activeSelected, incidenceSelected, mortalitySelected);

const newsDataSelected = document.getElementById("news_data_checkbox").checked;
const newsLayer = new NewsStandDataLayer(newsDataSelected,
    function (clusterSize) {
      let color;
      if (clusterSize < 10) {
        color = 'rgba(181, 226, 140, 0.6)';
      } else if (clusterSize < 100) {
        color = 'rgba(241, 211, 87, 0.6)';
      } else {
        color = 'rgba(253, 156, 115, 0.6)';
      }
      return color;
    },
    function () {
      const keyword = document.getElementById('keyword').value;
      const start_date = new Date(document.getElementById('start_date').value);
      const end_date = new Date(document.getElementById('end_date').value);

      const start_epoch_mins = dateToEpochMins(start_date);
      const end_epoch_mins = dateToEpochMins(end_date) + (1000 * 60) - 1;

      return "https://newsstand.umiacs.umd.edu/coronaviz/disease_time_query" +
          "?keyword=" + keyword +
          "&start_date=" + start_epoch_mins +
          "&end_date=" + end_epoch_mins;

    });

const twitterDataSelected = document.getElementById("twitter_data_checkbox").checked;
const twitterLayer = new NewsStandDataLayer(twitterDataSelected,
    function (clusterSize) {
      return 'rgba(85, 85, 250, 0.6)';
    },
    function () {
      const start_date = new Date(document.getElementById('start_date').value);
      const end_date = new Date(document.getElementById('end_date').value);

      const start_epoch_mins = dateToEpochMins(start_date);
      const end_epoch_mins = dateToEpochMins(end_date) + (1000 * 60) - 1;

      return "https://newsstand.umiacs.umd.edu/coronaviz/twitter_query" +
          "?start_date=" + start_epoch_mins +
          "&end_date=" + end_epoch_mins;
    });

document.getElementById("end_date").valueAsDate = new Date();
downloadData();

function downloadData() {

  const twitterUpdate = twitterLayer.updateLayer();
  const newsUpdate = newsLayer.updateLayer();

  Promise.allSettled([twitterUpdate, newsUpdate]).then(function (results) {
    dataEndDate = document.getElementById("end_date").valueAsDate;
    dataStartDate = document.getElementById("start_date").valueAsDate;

    document.getElementById('animation_start').valueAsDate = dataStartDate;
    document.getElementById('animation_end').valueAsDate = dataEndDate;

    const min = dateToEpochMins(dataStartDate);
    const max = dateToEpochMins(dataEndDate);

    slider_range.slider("option", "min", min);
    slider_range.slider("option", "max", max);

    if(animate_window_max) {
      animateWindow = max - min;
    }

    setDisplayedDateRange(min, min + animateWindow);

    //Hack because Hanan wants it and I don't care anymore
    selectMarkerByName('Brazil');
  });
}

//TODO: make this a binary search since that's definitely more efficient. To bad
// I'm too lazy to do it right the first time. Well, it seems to work as is,
// so why do more work than I have to? Make this change if it's too slow.
function nodeIndexOfTime(list, time) {
  const index = list.findIndex(function (e) {
    return e >= time;
  });
  if (index === -1) {
    return list.length - 1;
  } else {
    return index;
  }
}

// 99% sure this isn't the correct way to do this, but I can't be bothered to
// learn proper threading in JS. Not sure it even exists. This looks like it
// works though.

async function animateMarkers() {
  if (!animating) {
    document.getElementById("animate").style.display = "";
    document.getElementById("paused").style.display = "none";
    document.getElementById("animate").innerHTML = 'Pause Animation';
    animating = true;

    if (!animation_paused) {
      setDisplayedDateRange(dateToEpochMins(dataStartDate), dateToEpochMins(dataStartDate) + animateWindow);
    }
    while (animating && stepForward()) {
      await new Promise(r => setTimeout(r, animateSpeed));
    }
    if (animating) {
      await terminateAnimation();
    }
  } else {
    pauseAnimation();
  }
}

function pauseAnimation() {
  animating = false;
  animation_paused = true;

  document.getElementById("animate").style.display = "none";
  document.getElementById("paused").style.display = "";
}

// Since I'm doing a bit of a hack here, the least I can do is hide it in function.
async function terminateAnimation() {
  animating = false;
  animation_paused = false;

  document.getElementById("animate").style.display = "";
  document.getElementById("paused").style.display = "none";
  document.getElementById("animate").innerHTML = 'Start Animation &raquo;';
  if (dataEndDate) {
    if(!totalAnimation) {
      setDisplayedDateRange(dateToEpochMins(dataEndDate) - animateWindow, dateToEpochMins(dataEndDate));
    } else {
      setDisplayedDateRange(dateToEpochMins(dataStartDate), dateToEpochMins(dataEndDate));
    }
    while (jhuLayer.isTimeWindowEmpty()) {
      stepBack();
      await new Promise(r => setTimeout(r, animateSpeed));
    }
  }
}

function normalizeCount(clusterSize) {
  if (dailyRate) {
    return ((clusterSize / animateWindow) * (60 * 24)).toFixed(1);
  } else {
    return clusterSize;
  }
}

function markerSize(clusterSize, type) {
  clusterSize = clusterSize;//normalizeCount(clusterSize);
  if(log_scale || type == -1) {
    if (clusterSize <= 0) {
      return 0;
    } else {
      const size = 40 + Math.log(2 * clusterSize) ** 2;
      switch (type) {
        case -1: return size;
        case 0: return size * confirmed_scale;
        case 1: return size * deaths_scale;
        case 2: return size * recoveries_scale;
        case 3: return size * active_scale;
      }
    }
  }
  else {
    let max_daily;
    if(type == 0){
      max_daily = 50000;
    } else {
      max_daily = 10000;
    }

    let windowSize = 0;
    if (totalAnimation) {
        windowSize = displayEndDate - displayStartDate;
    } else {
        windowSize = animateWindow;
    }

    const max_range = max_daily * (windowSize / (60 * 24));

    const max_size = 1000;
    const size = 10 + max_size * (clusterSize / max_range);
    switch (type) {
      case 0: return size * confirmed_scale;
      case 1: return size * deaths_scale;
      case 2: return size * recoveries_scale;
      case 3: return size * active_scale;
    }
  }
}

function markerSize2(clusterSize, totalSize, type) {
  if (clusterSize<= 0 || totalSize <= 0) return 0;
  else {
    if (type == 0) {
      let windowSize = 0;
      if (totalAnimation) {
          windowSize = dateToEpochMins(dataEndDate) - dateToEpochMins(dataStartDate);
      } else {
          windowSize = animateWindow;
      }
      if (dataEndDate == undefined) return 0;
      const ratio = (dateToEpochMins(dataEndDate) - dateToEpochMins(dataStartDate)) / windowSize;
      const scale = Math.log(ratio) + 1;
      return (10 + clusterSize / (totalSize / 10000) * scale) * incidence_scale;
    }
    else if (type == 1) {
      var percent = clusterSize / totalSize;
      if (percent > 0.5) percent = 0.5;
      const maxSize = 250;
      return (10 + maxSize * percent) * mortality_scale;
    }
  }
}

function setScale(type) {
  if (type == 2) {
    pop_scale = true;
    uncheckPlotting('confirmed');
    uncheckPlotting('deaths');
    uncheckPlotting('recoveries');
    uncheckPlotting('active');
    checkPlotting('incidence');
    checkPlotting('mortality');
  }
  else {
    pop_scale = false;
    log_scale = (type == 0);
    checkPlotting('confirmed');
    checkPlotting('deaths');
    uncheckPlotting('recoveries');
    uncheckPlotting('active');
    uncheckPlotting('incidence');
    uncheckPlotting('mortality');
  }
  setDisplayedDateRange(displayStartDate, displayEndDate);
}

function checkPlotting(subLayer) {
  if (document.getElementById(subLayer + '_checkbox').checked == false) {
    document.getElementById(subLayer + '_checkbox').checked = true;
    jhuLayer.togglePlotting(subLayer);
  }
}

function uncheckPlotting(subLayer) {
  if (document.getElementById(subLayer + '_checkbox').checked == true) {
    document.getElementById(subLayer + '_checkbox').checked = false;
    jhuLayer.togglePlotting(subLayer);
  }
}

function dateToEpochMins(date) {
  return date.getTime() / (1000 * 60);
}

function epochMinsToDate(mins) {
  return new Date(mins * 60 * 1000);
}

function updateProgressBar(processed, total, elapsed, layersArray) {
  const progress = document.getElementById('progress');
  const progressBar = document.getElementById('progress-bar');

  if (elapsed > 500) {
    // if it takes more than half a second to load, display the progress bar:
    progress.style.display = 'block';
    progressBar.style.width = Math.round(processed / total * 100) + '%';
  }

  if (processed === total) {
    // all markers processed - hide the progress bar:
    progress.style.display = 'none';
  }
}

function setAnimateWindowFromInput(size) {
  setAnimateWindow(24*60*parseInt(size));
}

function setAnimateWindow(size) {
  animateWindow = size;
  const startDate = displayStartDate;
  const endDate = startDate + animateWindow;
  setDisplayedDateRange(startDate, endDate);
}

function toggleAnimateMax() {
  animate_window_max = !animate_window_max;
  if (animate_window_max) {
    document.getElementById('animate_window').disabled = true;
    tempAnimateWindow = animateWindow;
    const startDate = dateToEpochMins(dataStartDate);
    const endDate = dateToEpochMins(dataEndDate);
    animateWindow = endDate - startDate;
    setDisplayedDateRange(startDate, endDate);
    //displayStartDate = dataStartDate;
    //setAnimateWindow(dateToEpochMins(dataEndDate) - dateToEpochMins(dataStartDate));
  } else {
    document.getElementById('animate_window').disabled = false;
    setAnimateWindow(tempAnimateWindow);
  }
}

function formatDate(date) {
  var d = new Date(date),
      month = '' + (d.getMonth() + 1),
      day = '' + d.getDate(),
      year = d.getFullYear();

  if (month.length < 2) 
      month = '0' + month;
  if (day.length < 2) 
      day = '0' + day;

  return [year, month, day].join('-');
}

function setDisplayedDateRange(startMins, endMins) {
  const minMins = dataStartDate.getTime() / 60 / 1000;
  const maxMins = dataEndDate.getTime() / 60 / 1000;
  const min = Number(((startMins - minMins) * 100) / (maxMins - minMins));
  const max = Number(((endMins - minMins) * 100) / (maxMins - minMins));
  const normalMin = min / 100 * 90 + 5;
  const normalMax = max / 100 * 90 + 5;
  document.getElementById('start').style.left = normalMin + "%";
  document.getElementById('end').style.left = normalMax + "%";

  displayEndDate = endMins;
  displayStartDate = startMins;
  // Set UI controls to reflect these values
  document.getElementById("display_start_date").valueAsDate = epochMinsToDate(startMins);
  document.getElementById("display_end_date").valueAsDate = epochMinsToDate(endMins);
  document.getElementById("start").innerHTML = formatDate(epochMinsToDate(startMins + 12 * 60));
  document.getElementById("end").innerHTML = formatDate(epochMinsToDate(endMins + 12 * 60));
  slider_range.slider("values", [startMins, endMins]);

  // Update all layers for new range
  newsLayer.plotData(startMins, endMins);
  twitterLayer.plotData(startMins, endMins);
  jhuLayer.plotData(startMins, endMins);

  if (selected_marker) {
    info.updateForMarker(selected_marker);
  }
  if (sidebar_selected_marker) {
    updateSidebarForMarker(sidebar_selected_marker);
  }
}

function setAnimateStep(step) {
  animateStep = parseInt(step);
}

function setAnimateSpeed(speed) {
  animateSpeed = parseInt(speed);
}

function setAnimationType(type) {
  dailyRate = type;
  if (selected_marker) {
    info.updateForMarker(selected_marker);
  }
  if (sidebar_selected_marker) {
    updateSidebarForMarker(sidebar_selected_marker);
  }

}

function stepForward() {
  let current_end = displayEndDate;
  current_end += animateStep;
  let current_start = displayStartDate;
  if(!totalAnimation){
    current_start += animateStep;
  }
  if (current_end <= dateToEpochMins(dataEndDate)) {
    setDisplayedDateRange(current_start, current_end);
    return true;
  } else {
    return false;
  }
}

function stepBack() {
  let current_end = displayEndDate;
  current_end -= animateStep;
  let current_start = displayStartDate;
  current_start -= animateStep;
  if(!totalAnimation) {
    if (current_start >= dateToEpochMins(dataStartDate) && current_end <= dateToEpochMins(dataEndDate))
      setDisplayedDateRange(current_start, current_end);
  } else {
    if (current_end >= dateToEpochMins(dataStartDate)) 
      setDisplayedDateRange(displayStartDate, current_end);
  }
}

function setCountryView(country_code) {
  const bb = bounding_boxes[country_code][1];
  map.fitBounds([[bb[1], bb[0]], [bb[3], bb[2]]]);
  const name = sorted_options.find(e => e[0] == country_code)[1][0];
  selectMarkerByName(name);
}

function setMarylandView() {
  const maryland_bb = [[39.762, -79.514], [37.888, -75.015]];
  map.fitBounds(maryland_bb);
}

function setVirginiaView() {
  const virginia_bb = [[39.462, -83.672], [36.571, -75.015]];
  map.fitBounds(virginia_bb);
}

// I'm not using a new variable here because I'm a lazy sod 

function setAnimationRange(start, end) {
  dataStartDate = start;
  dataEndDate = end;

  const min = dateToEpochMins(dataStartDate);
  const max = dateToEpochMins(dataEndDate);

  slider_range.slider("option", "min", min);
  slider_range.slider("option", "max", max);

  setDisplayedDateRange(min, min + animatewindow);
}

function toggleFloatingBox() {
  floating_box = !floating_box;
}

function setTotalAnimation(total) {
  if (total == true) {
    totalAnimation = true;
    document.getElementById('animate_window').disabled = true;
    animateWindow = 0;
    setDisplayedDateRange(dateToEpochMins(dataStartDate), displayEndDate);
  }
  else {
    totalAnimation = false;
    document.getElementById('animate_window').disabled = false;
    animateWindow = 24*60 * parseInt(document.getElementById('animate_window').value);
    if (displayEndDate - animateWindow >= dateToEpochMins(dataStartDate)) 
      setDisplayedDateRange(displayEndDate - animateWindow, displayEndDate);
    else 
      setDisplayedDateRange(dateToEpochMins(dataStartDate), dateToEpochMins(dataStartDate) + animateWindow);
  }
}
